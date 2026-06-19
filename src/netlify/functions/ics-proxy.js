// netlify/functions/ics-proxy.js
// Server-side fetch for external iCal feeds (Airbnb, Booking.com, VRBO, etc).
// This exists because browsers block cross-origin fetches to most OTA
// calendar URLs (no CORS headers on their side) — so the import-by-URL
// feature in the Host Portal → Calendar Sync screen calls this instead of
// fetching the feed directly from the browser.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const MAX_BYTES = 2 * 1024 * 1024; // 2MB — calendar feeds are tiny, this is generous
const TIMEOUT_MS = 15000;

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const target = new URL(req.url).searchParams.get("url");
  if (!target) {
    return new Response(JSON.stringify({ error: "Missing ?url= parameter" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // Only allow http(s) — blocks file://, data:// and other schemes that
  // could be used to probe internal services.
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return new Response(JSON.stringify({ error: "Only http/https URLs are allowed" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        // Some OTA calendar endpoints reject requests with no UA header.
        "User-Agent": "Mozilla/5.0 (compatible; CalendarSyncBot/1.0)",
        Accept: "text/calendar, text/plain, */*",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Upstream calendar returned ${res.status}` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "Calendar feed too large" }), {
        status: 502, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const text = new TextDecoder("utf-8").decode(buf);

    // Sanity check — a real .ics file should contain this.
    if (!text.includes("BEGIN:VCALENDAR")) {
      return new Response(
        JSON.stringify({ error: "That URL did not return a valid calendar (.ics) file." }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ text }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg = err.name === "AbortError" ? "Calendar fetch timed out" : `Fetch failed: ${err.message}`;
    return new Response(JSON.stringify({ error: msg }), {
      status: 502, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/ics-proxy" };
