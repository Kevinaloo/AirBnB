// api/push-subscribe.js
// Stores a browser Web-Push subscription so the server can later notify it.
// Subscriptions are kept in Supabase kv_store under two keys:
//   <slug>:push:admin  — device(s) that logged into the Host Portal
//   <slug>:push:guest  — guests who opted in (booking updates)
// The client calls this after the user grants notification permission.

import { createClient } from "@supabase/supabase-js";
import { BRAND } from "../lib/brand.config.js";

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

  let body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { subscription, role } = body || {};
  if (!subscription || !subscription.endpoint) return json({ error: "Missing subscription" }, 400);
  const bucket = role === "admin" ? "admin" : "guest";

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !key) return json({ error: "Not configured" }, 500);
  const supabase = createClient(supabaseUrl, key);

  const kvKey = `${BRAND.slug}:push:${bucket}`;
  const { data } = await supabase.from("kv_store").select("value").eq("key", kvKey).single();
  let subs = [];
  try { subs = data ? JSON.parse(data.value) : []; } catch { subs = []; }

  // De-dupe by endpoint
  if (!subs.some((s) => s.endpoint === subscription.endpoint)) {
    subs.push(subscription);
    // Cap stored subscriptions to keep the row small
    subs = subs.slice(-50);
    await supabase.from("kv_store").upsert({ key: kvKey, value: JSON.stringify(subs) }, { onConflict: "key" });
  }

  return json({ ok: true, count: subs.length });
};
