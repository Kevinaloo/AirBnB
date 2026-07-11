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
import { BRAND } from "../lib/brand.config.js";

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
  const alerts = [];
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
        const feedDates = new Set(events.flatMap((e) => e.dates));

        // Track which dates this specific platform previously contributed, so
        // we can detect when the OTA OPENS a date (guest cancelled there) as
        // well as when it CLOSES one (new booking there). Stored per-config.
        const prevFeedDates = new Set(cfg.feedDates || []);
        const addedDates = [...feedDates].filter((d) => !prevFeedDates.has(d)).sort();
        const removedDates = [...prevFeedDates].filter((d) => !feedDates.has(d)).sort();

        // Apply to the listing's master bookedDates:
        //  - add every date this feed now shows as blocked
        //  - remove dates this feed dropped, UNLESS another feed or a direct
        //    booking still holds them (checked below against other configs)
        const before = new Set(listing.bookedDates || []);
        addedDates.forEach((d) => before.add(d));

        // Only release a removed date if no OTHER sync feed for this listing
        // still lists it (prevents one platform re-opening a date another
        // platform still has booked).
        const otherFeedDates = new Set(
          (configs || [])
            .filter((_, ci) => ci !== i)
            .flatMap((c) => c.feedDates || [])
        );
        removedDates.forEach((d) => { if (!otherFeedDates.has(d)) before.delete(d); });

        listing.bookedDates = [...before].sort();
        listingsChanged = true;

        configs[i] = {
          ...cfg,
          lastSynced: new Date().toISOString(),
          eventsCount: events.length,
          datesCount: feedDates.size,
          feedDates: [...feedDates].sort(),
        };
        configsChanged = true;

        if (addedDates.length || removedDates.length) {
          newLogEntries.push({
            ts: new Date().toISOString(),
            listingName: listing.name,
            platform: cfg.platform,
            events: events.length,
            datesAdded: addedDates.length,
            datesRemoved: removedDates.length,
            mode: "auto",
          });
          alerts.push({
            listing: listing.name,
            platform: cfg.platform || "another platform",
            added: addedDates,
            removed: removedDates,
          });
        }
        results.push({ listing: listing.name, platform: cfg.platform, added: addedDates.length, removed: removedDates.length });
      } catch (err) {
        results.push({ listing: listing.name, platform: cfg.platform, error: err.message });
      }
    }
    syncConfigs[listing.id] = configs;
  }

  if (listingsChanged) await setKV(`${BRAND.slug}:listings`, listings);
  if (configsChanged) await setKV(`${BRAND.slug}:syncconfigs`, syncConfigs);
  if (newLogEntries.length) await setKV(`${BRAND.slug}:synclog`, [...newLogEntries, ...syncLog].slice(0, 50));

  // ── Notify the admin about every cross-platform change ──────────────
  // The host asked to be told when a date closes OR opens on another platform,
  // and on which platform it happened. We push one clear notification per
  // change bucket, and also mirror it via WhatsApp if configured.
  if (alerts.length) {
    const siteUrl = process.env.SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

    const fmtDates = (arr) => {
      if (arr.length <= 3) return arr.join(", ");
      return `${arr.slice(0, 3).join(", ")} +${arr.length - 3} more`;
    };

    for (const a of alerts) {
      const parts = [];
      if (a.added.length) parts.push(`🔴 ${a.added.length} date${a.added.length > 1 ? "s" : ""} now BOOKED (${fmtDates(a.added)})`);
      if (a.removed.length) parts.push(`🟢 ${a.removed.length} date${a.removed.length > 1 ? "s" : ""} FREED UP (${fmtDates(a.removed)})`);
      const title = `📅 ${a.platform}: ${a.listing}`;
      const message = parts.join("  •  ");

      // Delegate to our own /api/notify endpoint (handles VAPID + subscriber lookup)
      if (siteUrl) {
        fetch(`${siteUrl}/api/notify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "admin", title, message, url: "/?admin=1", tag: `sync-${a.listing}` }),
        }).catch(() => {});
      }
    }
  }

  console.log("[auto-sync] done:", JSON.stringify(results));
  return new Response(JSON.stringify({ ok: true, results, alerts }), { status: 200 });
};

