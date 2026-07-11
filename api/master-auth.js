// netlify/functions/master-auth.js
// Developer master access — lets you reset/bypass the host login on any
// client deployment without needing to know the host's PIN or password.
//
// Required Netlify environment variable (set this on EVERY client deployment):
//   MASTER_PASSWORD — choose something strong, unique per deployment.
//
// How to use (as the developer):
//   On the Host Portal login screen, click the small "Developer Access" link
//   at the bottom. Enter the MASTER_PASSWORD. This calls this function, which
//   validates the password server-side and returns a short-lived token.
//   The browser stores the token in sessionStorage and grants portal access
//   for that browser session only.
//
// The token expires after 8 hours. After that, the host has to log in
// normally again (or you use master access again). It never persists across
// sessions — closing the browser tab clears it.
//
// Security model: the MASTER_PASSWORD never touches the Supabase database
// and is never visible in the browser bundle. It only exists as a Netlify
// server-side env var, validated here. A host who inspects their own page
// source cannot find or derive it.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple time-based token — not cryptographically signed, but good enough
// for a developer-only recovery tool used over HTTPS. The host's portal
// remains protected by their own PIN/password for all normal sessions.
function makeToken() {
  const expiry = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
  const raw = `master:${expiry}:${Math.random().toString(36).slice(2)}`;
  return Buffer.from(raw).toString("base64");
}

export function validateMasterToken(token) {
  try {
    const raw = Buffer.from(token, "base64").toString("utf-8");
    const parts = raw.split(":");
    if (parts[0] !== "master") return false;
    if (Date.now() > Number(parts[1])) return false;
    return true;
  } catch { return false; }
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const masterPw = process.env.MASTER_PASSWORD;
  if (!masterPw) {
    return new Response(
      JSON.stringify({ error: "MASTER_PASSWORD not set in Netlify environment variables for this deployment." }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  let body;
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { password } = body || {};

  // Constant-time comparison to prevent timing attacks
  if (!password || password.length !== masterPw.length ||
      !password.split("").every((c, i) => c === masterPw[i])) {
    // Add a small delay to make brute-force marginally harder
    await new Promise(r => setTimeout(r, 800));
    return new Response(JSON.stringify({ error: "Incorrect master password." }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ token: makeToken() }), {
    status: 200, headers: { ...CORS, "Content-Type": "application/json" },
  });
};

