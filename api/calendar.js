// api/calendar.js  (Vercel serverless — live iCal EXPORT feed)
// ────────────────────────────────────────────────────────────────────
// OTAs (Airbnb, Booking.com, VRBO) don't accept a downloaded .ics file —
// they need a STABLE URL they can subscribe to and re-poll every few hours.
// This endpoint serves exactly that: a live iCalendar feed for one listing,
// generated fresh from Supabase on every request, so any date blocked on
// this site (a direct booking or a manual block) instantly propagates to
// every connected platform on their next sync.
//
//   Subscribe URL:  https://<your-domain>/api/calendar?listing=<listingId>
//
// The Host Portal → Calendar Sync screen shows this URL per listing with a
// copy button; the host pastes it into each OTA's "import calendar" field.
// ────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { BRAND } from "../src/brand.config.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const pad = (n) => String(n).padStart(2, "0");
const addDays = (key, n) => {
  const d = new Date(key + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

function buildICS(listing, bookings) {
  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BRAND.icsDomain}//${BRAND.icsDomain} Calendar//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${listing.name} — ${BRAND.fullName}`,
    `X-WR-TIMEZONE:${BRAND.timezone}`,
  ];

  const listingBookings = (bookings || []).filter((b) => b.listing?.id === listing.id);

  // Confirmed direct bookings
  for (const b of listingBookings) {
    if (!b.checkIn || !b.checkOut) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.ref}@${BRAND.icsDomain}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${b.checkIn.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${b.checkOut.replace(/-/g, "")}`,
      `SUMMARY:Booked — ${BRAND.fullName}`,
      "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  // Manually blocked / OTA-synced dates — group contiguous into ranges
  const blocked = [...new Set(listing.bookedDates || [])].sort();
  if (blocked.length) {
    const ranges = [];
    let start = blocked[0], prev = blocked[0];
    for (let i = 1; i < blocked.length; i++) {
      if (blocked[i] === addDays(prev, 1)) prev = blocked[i];
      else { ranges.push([start, addDays(prev, 1)]); start = blocked[i]; prev = blocked[i]; }
    }
    ranges.push([start, addDays(prev, 1)]);
    for (const [s, e] of ranges) {
      const coveredByBooking = listingBookings.some((b) => b.checkIn <= s && b.checkOut >= e);
      if (coveredByBooking) continue;
      lines.push(
        "BEGIN:VEVENT",
        `UID:blocked-${s}-${e}@${BRAND.icsDomain}`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${s.replace(/-/g, "")}`,
        `DTEND;VALUE=DATE:${e.replace(/-/g, "")}`,
        `SUMMARY:Blocked — ${BRAND.fullName}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const listingId = new URL(req.url).searchParams.get("listing");
  if (!listingId) {
    return new Response("Missing ?listing= parameter", { status: 400, headers: CORS });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) {
    return new Response("Calendar service not configured", { status: 500, headers: CORS });
  }
  const supabase = createClient(supabaseUrl, key);

  const getKV = async (k, fallback) => {
    const { data, error } = await supabase.from("kv_store").select("value").eq("key", k).single();
    return error || !data ? fallback : JSON.parse(data.value);
  };

  const listings = await getKV(`${BRAND.slug}:listings`, []);
  const bookings = await getKV(`${BRAND.slug}:bookings`, []);
  const listing = listings.find((l) => l.id === listingId);

  if (!listing) {
    return new Response("Listing not found", { status: 404, headers: CORS });
  }

  const ics = buildICS(listing, bookings);
  return new Response(ics, {
    status: 200,
    headers: {
      ...CORS,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${BRAND.slug}-${listingId}.ics"`,
      // Let OTAs and CDNs cache briefly; availability doesn't need to be real-time to the second.
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
};
