// netlify/functions/listing-fetch.js
// Server-side fetch for property listing pages (Airbnb, Booking.com, VRBO,
// etc) used by the "Import from URL" host onboarding flow.
//
// This replaces an earlier version of this feature that called a public,
// free CORS-proxy service (api.allorigins.win) directly from the browser.
// That's unreliable for a feature hosts depend on to onboard — third-party
// public proxies get rate-limited and go down with no warning, and we have
// no control over headers (some listing sites only render full content for
// requests with a real browser User-Agent). Fetching server-side instead
// gives us that control and one less point of failure outside our hands.
//
// Honest limitation: Airbnb and Booking.com pages are heavily JavaScript-
// rendered, so this gets whatever is in the initial server-rendered HTML —
// title, hero image, description, and Open Graph/JSON-LD metadata usually
// come through; the full photo gallery, exact amenities list, and especially
// exact coordinates often don't, since Airbnb in particular doesn't publish
// a listing's precise location publicly (it shows guests an approximate
// area until after booking, by design). That's why the import review screen
// always asks the host to confirm the pin location and price before
// publishing — this endpoint gets you most of the way, not all of it.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 8 * 1024 * 1024; // 8MB — listing pages can be large with inline data
const TIMEOUT_MS = 20000;

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const target = body?.url;
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return new Response(JSON.stringify({ error: "Please enter a valid URL starting with https://" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
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
      redirect: "follow",
      headers: {
        // A real browser UA gets fuller server-rendered output from some
        // listing sites than a generic/bot-looking UA does.
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `That page returned an error (${res.status}). Some sites block automated requests — try copying the listing details in manually if this keeps failing.` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "That page is too large to import automatically." }), {
        status: 502, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const html = new TextDecoder("utf-8").decode(buf);
    return new Response(JSON.stringify({ html, finalUrl: res.url }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg = err.name === "AbortError"
      ? "That page took too long to load. Please try again."
      : `Could not fetch that page: ${err.message}`;
    return new Response(JSON.stringify({ error: msg }), {
      status: 502, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/listing-fetch" };
