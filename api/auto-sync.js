// netlify/functions/auto-sync.js
// Runs on a schedule (see `config.schedule` below) and re-fetches every
// connected URL-based calendar feed across all listings, without the host
// needing to click "Sync now" in the dashboard. This is what makes the
// two-way sync genuinely automatic rather than only on-demand.
//
// Required Netlify environment variables (separate from the browser-side
// VITE_ ones — this needs elevated access since it runs server-side):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   — from Supabase → Project Settings → API
//
// Schedule is set via the `schedule` field below (every 6 hours by
// default). OTA platforms regenerate these feeds every 1-24h depending on
// the platform, so checking more often than every few hours rarely finds
// anything new and risks rate limiting.

import { createClient } from "@supabase/supabase-js";
import { BRAND } from "../src/brand.config.js";

function parseICS(text) {
  const events = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const getVal = (key) => {
      const m = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
      return m ? m[1].trim() : null;
    };
    const rawStart = getVal("DTSTART");
    const rawEnd = getVal("DTEND");
    if (!rawStart) continue;
    const parseDate = (s) => {
      const d = s.replace(/T.*/, "");
      return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    };
    const start = parseDate(rawStart);
    const end = rawEnd ? parseDate(rawEnd) : start;
    const dates = [];
    let cur = start;
    while (cur < end) {
      dates.push(cur);
      const dt = new Date(cur + "T00:00:00");
      dt.setDate(dt.getDate() + 1);
      cur = dt.toISOString().slice(0, 10);
    }
    if (dates.length === 0) dates.push(start);
    events.push({ start, end, dates });
  }
  return events;
}

export default async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("[auto-sync] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Not configured" }), { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const getKV = async (key, fallback) => {
    const { data, error } = await supabase.from("kv_store").select("value").eq("key", key).single();
    return error || !data ? fallback : JSON.parse(data.value);
  };
  const setKV = async (key, value) => {
    await supabase.from("kv_store").upsert({ key, value: JSON.stringify(value) }, { onConflict: "key" });
  };

  const listings = await getKV(`${BRAND.slug}:listings`, []);
  const syncConfigs = await getKV(`${BRAND.slug}:syncconfigs`, {});
  const syncLog = await getKV(`${BRAND.slug}:synclog`, []);

  let listingsChanged = false;
  let configsChanged = false;
  const newLogEntries = [];
  const results = [];

  for (const listing of listings) {
    const configs = syncConfigs[listing.id] || [];
    for (let i = 0; i < configs.length; i++) {
      const cfg = configs[i];
      if (!/^https?:\/\//i.test(cfg.source || "")) continue; // skip file/paste imports — nothing to re-fetch

      try {
        const res = await fetch(cfg.source, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; CalendarSyncBot/1.0)" },
        });
        if (!res.ok) {
          results.push({ listing: listing.name, platform: cfg.platform, error: `HTTP ${res.status}` });
          continue;
        }
        const text = await res.text();
        if (!text.includes("BEGIN:VCALENDAR")) {
          results.push({ listing: listing.name, platform: cfg.platform, error: "Not a valid .ics feed" });
          continue;
        }
        const events = parseICS(text);
        const newDates = [...new Set(events.flatMap((e) => e.dates))];
        const before = new Set(listing.bookedDates || []);
        const merged = [...new Set([...before, ...newDates])].sort();
        const added = merged.length - before.size;

        listing.bookedDates = merged;
        listingsChanged = true;

        configs[i] = { ...cfg, lastSynced: new Date().toISOString(), eventsCount: events.length, datesCount: newDates.length };
        configsChanged = true;

        if (added > 0) {
          newLogEntries.push({
            ts: new Date().toISOString(),
            listingName: listing.name,
            platform: cfg.platform,
            events: events.length,
            datesAdded: added,
            mode: "auto",
          });
        }
        results.push({ listing: listing.name, platform: cfg.platform, added });
      } catch (err) {
        results.push({ listing: listing.name, platform: cfg.platform, error: err.message });
      }
    }
    syncConfigs[listing.id] = configs;
  }

  if (listingsChanged) await setKV(`${BRAND.slug}:listings`, listings);
  if (configsChanged) await setKV(`${BRAND.slug}:syncconfigs`, syncConfigs);
  if (newLogEntries.length) await setKV(`${BRAND.slug}:synclog`, [...newLogEntries, ...syncLog].slice(0, 50));

  console.log("[auto-sync] done:", JSON.stringify(results));
  return new Response(JSON.stringify({ ok: true, results }), { status: 200 });
};

