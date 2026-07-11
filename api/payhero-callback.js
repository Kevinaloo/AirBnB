// api/payhero-callback.js
// PayHero POSTs the payment result here after the guest enters their M-Pesa PIN.
// We store the result in Supabase kv_store so the client polling loop can find it
// instantly instead of waiting for the next poll interval.
//
// PayHero callback payload looks like:
// { external_reference, status, amount, phone_number, transaction_code, ... }

import { createClient } from "@supabase/supabase-js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req) => {
  // PayHero sends a POST; some implementations also ping with GET
  if (req.method === "GET") return json({ ok: true, message: "Callback endpoint live" });

  let body;
  try { body = await req.json(); } catch { return json({ ok: true }); }

  console.log("[payhero-callback] received:", JSON.stringify(body));

  const ref = body?.external_reference || body?.reference;
  const status = (body?.status || "").toUpperCase();

  if (ref && status) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (supabaseUrl && key) {
        const supabase = createClient(supabaseUrl, key);
        await supabase.from("kv_store").upsert(
          { key: `payhero_cb:${ref}`, value: JSON.stringify(body) },
          { onConflict: "key" }
        );
      }
    } catch (e) {
      console.error("[payhero-callback] supabase error:", e.message);
    }
  }

  // PayHero expects a 200 OK to acknowledge receipt
  return json({ ok: true });
};
