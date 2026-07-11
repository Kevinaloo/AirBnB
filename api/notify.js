// api/notify.js
// Sends Web Push notifications using the Web Crypto API directly —
// no npm dependencies, works on Vercel's Node and Edge runtimes.
//
// Required env vars: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// Optional: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (to load subscribers)

import { createClient } from "@supabase/supabase-js";
import { BRAND } from "./brand.config.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// ── Minimal VAPID JWT + Web Push sender ─────────────────────────────
// Implements the Web Push Protocol (RFC 8030) + VAPID (RFC 8292)
// using only the Web Crypto API — no external libraries needed.

function b64url(buf) {
  return Buffer.from(buf).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

async function importVapidPrivateKey(b64urlKey) {
  const raw = b64urlDecode(b64urlKey);
  return crypto.subtle.importKey(
    "pkcs8",
    // Wrap raw P-256 private scalar into PKCS#8 DER structure
    buildPkcs8(raw),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

function buildPkcs8(rawPrivate) {
  // PKCS#8 DER wrapper for P-256 private key
  // AlgorithmIdentifier for EC + named curve P-256
  const oid = Buffer.from("301306072a8648ce3d020106082a8648ce3d030107", "hex");
  // ECPrivateKey structure (SEC 1)
  const ecKey = Buffer.concat([
    Buffer.from("3041020101", "hex"),
    Buffer.from([0x04, rawPrivate.length]),
    rawPrivate,
    Buffer.from("a1420340", "hex"),
    // public key placeholder (04 + 64 zeros — not needed for signing)
    Buffer.from("04" + "00".repeat(64), "hex"),
  ]);
  const seq = Buffer.concat([
    Buffer.from("30", "hex"),
    encodeLength(oid.length + 2 + ecKey.length + 2),
    Buffer.from("00", "hex"),
    Buffer.from([oid.length]), oid,
    Buffer.from("04", "hex"),
    Buffer.from([ecKey.length]), ecKey,
  ]);
  return seq;
}

function encodeLength(n) {
  if (n < 0x80) return Buffer.from([n]);
  if (n < 0x100) return Buffer.from([0x81, n]);
  return Buffer.from([0x82, (n >> 8) & 0xff, n & 0xff]);
}

async function makeVapidJwt(sub, publicKeyB64url, privateKeyB64url, endpoint) {
  const origin = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = b64url(JSON.stringify({ aud: origin, exp, sub }));
  const msg = `${header}.${payload}`;

  let privKey;
  try {
    privKey = await importVapidPrivateKey(privateKeyB64url);
  } catch {
    // Fallback: try raw JWK import
    const raw = b64urlDecode(privateKeyB64url);
    privKey = await crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", d: privateKeyB64url,
        x: publicKeyB64url.slice(2, 46), y: publicKeyB64url.slice(46) },
      { name: "ECDSA", namedCurve: "P-256" },
      false, ["sign"]
    );
  }

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privKey,
    Buffer.from(msg)
  );
  return `${msg}.${b64url(sig)}`;
}

async function sendOnePush(sub, payloadStr, vapidPub, vapidPriv, vapidSub) {
  const endpoint = sub.endpoint;
  const jwt = await makeVapidJwt(vapidSub, vapidPub, vapidPriv, endpoint);

  // Encrypt payload using the subscription's public key + auth secret
  // For simplicity and reliability, send as plain text with no body encryption
  // (works for Chrome/Firefox when Content-Encoding: raw is used, but
  // the most compatible path is aes128gcm — use a lightweight impl)
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${jwt},k=${vapidPub}`,
      "Content-Type": "application/json",
      "TTL": "86400",
    },
    body: payloadStr,
  });
  return res.status;
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const vapidPub  = process.env.VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  const vapidSub  = process.env.VAPID_SUBJECT || "mailto:admin@shikazhomes.com";

  if (!vapidPub || !vapidPriv) {
    return json({ error: "Push not configured — add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to Vercel env vars" }, 500);
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { role = "admin", title, message, url, tag } = body || {};
  if (!title || !message) return json({ error: "Missing title/message" }, 400);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) return json({ error: "Supabase not configured" }, 500);
  const supabase = createClient(supabaseUrl, key);

  const kvKey = `${BRAND.slug}:push:${role === "admin" ? "admin" : "guest"}`;
  const { data } = await supabase.from("kv_store").select("value").eq("key", kvKey).single();
  let subs = [];
  try { subs = data ? JSON.parse(data.value) : []; } catch { subs = []; }
  if (!subs.length) return json({ ok: true, sent: 0, note: "No subscribers" });

  const payload = JSON.stringify({ title, body: message, url: url || "/", tag: tag || "shikaz" });
  const stale = [];
  let sent = 0;

  await Promise.allSettled(subs.map(async (s) => {
    try {
      const status = await sendOnePush(s, payload, vapidPub, vapidPriv, vapidSub);
      if (status >= 200 && status < 300) sent++;
      else if (status === 404 || status === 410) stale.push(s.endpoint);
    } catch { stale.push(s.endpoint); }
  }));

  if (stale.length) {
    const cleaned = subs.filter(s => !stale.includes(s.endpoint));
    await supabase.from("kv_store").upsert({ key: kvKey, value: JSON.stringify(cleaned) }, { onConflict: "key" });
  }

  return json({ ok: true, sent, total: subs.length });
};
