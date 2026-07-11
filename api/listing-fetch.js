// api/listing-fetch.js  (Vercel serverless function)
// ────────────────────────────────────────────────────────────────────
// Server-side fetch for property listing pages (Airbnb, Booking.com, VRBO,
// your own site, etc) used by the "Import from URL" host onboarding flow.
//
// WHY THIS IS SHAPED THE WAY IT IS
// Airbnb and Booking.com actively block requests coming from datacenter IPs
// (which is exactly what Vercel/Netlify serverless functions are) with a 403,
// no matter how real the User-Agent looks. A plain server fetch therefore
// works great for the host's OWN website and many smaller OTAs, but will be
// blocked by the big two. So this function tries, in order:
//
//   1. DIRECT FETCH  — free, instant, works for most sites and all own-sites.
//   2. SCRAPER API    — only if the host has set SCRAPER_API_KEY. Routes the
//                       request through a residential-proxy / headless-render
//                       service that CAN get past Airbnb/Booking's block and
//                       also executes their JavaScript (so price, beds, and
//                       the full photo gallery come through, not just OG tags).
//                       Compatible with ScraperAPI, Scrapingdog, ScrapingBee,
//                       and Zenrows-style "?api_key=&url=" endpoints via the
//                       SCRAPER_API_BASE env var.
//   3. BLOCKED SIGNAL — if direct is blocked and no scraper key is set, we
//                       return { blocked:true } (HTTP 200) so the UI can guide
//                       the host to the always-works "Paste details" mode
//                       instead of showing a dead-end error.
// ────────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const TIMEOUT_MS = 20000;
const SCRAPER_TIMEOUT_MS = 45000; // rendering services are slower

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

// Some hosts (Airbnb/Booking/Expo) block datacenter IPs. Detect that so we
// can decide whether to escalate to the scraper API or signal the UI.
function looksBlocked(status, html) {
  if (status === 403 || status === 429 || status === 503) return true;
  if (!html) return true;
  const h = html.slice(0, 4000).toLowerCase();
  return (
    h.includes("access denied") ||
    h.includes("captcha") ||
    h.includes("are you a human") ||
    h.includes("px-captcha") ||
    h.includes("cf-browser-verification") ||
    h.includes("just a moment") // Cloudflare interstitial
  );
}

async function fetchWithTimeout(url, opts, ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// Build the scraper-service URL. Defaults to ScraperAPI's format; override the
// base with SCRAPER_API_BASE for a different provider. `render=true` asks the
// service to execute JS (needed for Airbnb/Booking's client-rendered content).
function buildScraperUrl(targetUrl) {
  const key = process.env.SCRAPER_API_KEY;
  if (!key) return null;
  const base = process.env.SCRAPER_API_BASE || "https://api.scraperapi.com/";
  const u = new URL(base);
  u.searchParams.set("api_key", key);
  u.searchParams.set("url", targetUrl);
  // These params are understood by ScraperAPI/Scrapingdog/ScrapingBee.
  // Unknown params are simply ignored by providers that don't use them.
  u.searchParams.set("render", "true");
  if (process.env.SCRAPER_API_COUNTRY) {
    u.searchParams.set("country_code", process.env.SCRAPER_API_COUNTRY);
  }
  return u.toString();
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const target = body?.url;
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return json({ error: "Please enter a valid URL starting with https://" }, 400);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return json({ error: "Only http/https URLs are allowed" }, 400);
  }

  const targetUrl = parsed.toString();
  const hasScraper = !!process.env.SCRAPER_API_KEY;

  // ── Attempt 1: direct fetch ──────────────────────────────────────
  let directHtml = "";
  let directBlocked = false;
  try {
    const res = await fetchWithTimeout(
      targetUrl,
      { redirect: "follow", headers: BROWSER_HEADERS },
      TIMEOUT_MS
    );
    if (res.ok) {
      const buf = await res.arrayBuffer();
      if (buf.byteLength <= MAX_BYTES) {
        directHtml = new TextDecoder("utf-8").decode(buf);
      }
    }
    directBlocked = looksBlocked(res.status, directHtml);
    if (!res.ok && !directBlocked) {
      // A genuine non-block error (404, 500 on the target's own site).
      if (!hasScraper) {
        return json(
          { error: `That page returned an error (${res.status}). Double-check the URL is correct and public.` },
          502
        );
      }
    }
  } catch (err) {
    directBlocked = true; // network error / timeout — treat as needing escalation
  }

  if (directHtml && !directBlocked) {
    return json({ html: directHtml, finalUrl: targetUrl, via: "direct" });
  }

  // ── Attempt 2: scraper API (only if configured) ──────────────────
  const scraperUrl = buildScraperUrl(targetUrl);
  if (scraperUrl) {
    try {
      const res = await fetchWithTimeout(
        scraperUrl,
        { redirect: "follow", headers: { Accept: "text/html,*/*" } },
        SCRAPER_TIMEOUT_MS
      );
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength <= MAX_BYTES) {
          const html = new TextDecoder("utf-8").decode(buf);
          if (html && html.length > 200 && !looksBlocked(200, html)) {
            return json({ html, finalUrl: targetUrl, via: "scraper" });
          }
        }
      }
      // Scraper responded but couldn't get through either.
      return json({
        blocked: true,
        via: "scraper-failed",
        error:
          "This site blocked the automated import even through the scraping service. Use “Paste details” below — it always works.",
      });
    } catch (err) {
      return json({
        blocked: true,
        via: "scraper-error",
        error:
          "The scraping service timed out. Use “Paste details” below to add this listing instantly.",
      });
    }
  }

  // ── Attempt 3: blocked, no scraper configured ────────────────────
  // If we DID manage to pull partial HTML (e.g. OG tags before a block),
  // still return it — the client parser can use what it got.
  if (directHtml && directHtml.length > 200) {
    return json({ html: directHtml, finalUrl: targetUrl, via: "direct-partial" });
  }

  return json({
    blocked: true,
    via: "direct-blocked",
    error:
      "Airbnb and Booking.com block automated imports from servers. Use “Paste details” below — paste the listing text and photo links, and AI builds the listing for you in seconds.",
  });
};

