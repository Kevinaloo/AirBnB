// api/notify.js
// Sends a Web-Push notification to all stored subscriptions in a bucket.
// Called server-side (e.g. from the booking flow, or auto-sync when a new
// cross-platform block is detected). Requires VAPID keys in env:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@x.com)
//
// Generate a keypair once with:  npx web-push generate-vapid-keys

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { BRAND } from "../src/brand.config.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@shikazhomes.com";
  if (!pub || !priv) return json({ error: "Push not configured (missing VAPID keys)" }, 500);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { role = "admin", title, message, url, tag } = body || {};
  if (!title || !message) return json({ error: "Missing title/message" }, 400);

  webpush.setVapidDetails(subject, pub, priv);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) return json({ error: "Not configured" }, 500);
  const supabase = createClient(supabaseUrl, key);

  const kvKey = `${BRAND.slug}:push:${role === "admin" ? "admin" : "guest"}`;
  const { data } = await supabase.from("kv_store").select("value").eq("key", kvKey).single();
  let subs = [];
  try { subs = data ? JSON.parse(data.value) : []; } catch { subs = []; }
  if (!subs.length) return json({ ok: true, sent: 0, note: "No subscribers yet" });

  const payload = JSON.stringify({
    title,
    body: message,
    url: url || "/",
    tag: tag || "shikaz",
    requireInteraction: role === "admin",
  });

  const stale = [];
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(s, payload).catch((err) => {
        // 404/410 = subscription expired; mark for cleanup
        if (err.statusCode === 404 || err.statusCode === 410) stale.push(s.endpoint);
        throw err;
      })
    )
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;

  // Prune expired subscriptions
  if (stale.length) {
    const cleaned = subs.filter((s) => !stale.includes(s.endpoint));
    await supabase.from("kv_store").upsert({ key: kvKey, value: JSON.stringify(cleaned) }, { onConflict: "key" });
  }

  return json({ ok: true, sent, total: subs.length });
};
