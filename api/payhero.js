// api/payhero.js
// Server-side proxy for PayHero (M-Pesa STK push + status polling).
// Keeps PAYHERO_USERNAME / PAYHERO_PASSWORD off the browser bundle.
//
// Required Vercel environment variables (no VITE_ prefix — server only):
//   PAYHERO_USERNAME   — your PayHero API username
//   PAYHERO_PASSWORD   — your PayHero API password
//   PAYHERO_CHANNEL_ID — your PayHero channel ID (numeric)
//   SITE_URL           — your deployed domain e.g. https://shikazhomes.vercel.app
//                        (used as callback_url so PayHero can confirm payment)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user    = process.env.PAYHERO_USERNAME;
  const pass    = process.env.PAYHERO_PASSWORD;
  const channel = process.env.PAYHERO_CHANNEL_ID;

  if (!user || !pass || !channel) {
    return json({
      error: "PayHero not configured. Add PAYHERO_USERNAME, PAYHERO_PASSWORD, and PAYHERO_CHANNEL_ID to your Vercel environment variables.",
    }, 500);
  }

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");

  let body;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const { action, amount, phone, reference } = body || {};

  // ── 1. STK Push — initiate M-Pesa prompt on guest's phone ────────
  if (action === "push") {
    if (!amount || !phone || !reference) {
      return json({ error: "Missing amount, phone, or reference" }, 400);
    }

    // callback_url: PayHero POSTs the payment result here after the guest
    // enters their PIN. We use our own /api/payhero-callback endpoint so the
    // status is also stored server-side. Falls back to a no-op URL if SITE_URL
    // isn't set — polling still works because we check status on a timer.
    const siteUrl = process.env.SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const callbackUrl = siteUrl
      ? `${siteUrl}/api/payhero-callback`
      : "https://softcash.co.ke/banking-side/mpesa-callback.php";

    try {
      const res = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: Number(amount),
          phone_number: String(phone),
          channel_id: Number(channel),
          provider: "m-pesa",
          external_reference: reference,
          callback_url: callbackUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));

      // Log for debugging in Vercel function logs
      console.log("[payhero] STK push response:", JSON.stringify({ status: res.status, data }));

      if (!res.ok) {
        // Surface the exact PayHero error message
        const msg = data?.message || data?.error || data?.detail
          || `PayHero returned ${res.status}`;
        return json({ error: msg, raw: data }, res.status);
      }

      return json(data);
    } catch (err) {
      console.error("[payhero] push error:", err.message);
      return json({ error: `PayHero request failed: ${err.message}` }, 502);
    }
  }

  // ── 2. Status check — poll after STK push sent ───────────────────
  if (action === "status") {
    if (!reference) return json({ error: "Missing reference" }, 400);
    try {
      // PayHero status endpoint uses external_reference as the query parameter
      const res = await fetch(
        `https://backend.payhero.co.ke/api/v2/transaction-status?external_reference=${encodeURIComponent(reference)}`,
        {
          headers: { "Authorization": `Basic ${auth}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      console.log("[payhero] status response:", JSON.stringify({ status: res.status, data }));
      return json(data, res.status);
    } catch (err) {
      console.error("[payhero] status error:", err.message);
      return json({ error: `Status check failed: ${err.message}` }, 502);
    }
  }

  // ── 3. Credentials test — call from browser console or admin to verify ──
  // POST /api/payhero  { "action": "test" }
  if (action === "test") {
    try {
      // Hit the PayHero auth/ping endpoint — no real payment made
      const res = await fetch("https://backend.payhero.co.ke/api/v2/payments?page=1&per_page=1", {
        headers: { "Authorization": `Basic ${auth}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return json({ ok: true, message: "PayHero credentials are valid ✓", channel_id: channel });
      }
      return json({ ok: false, message: "Credentials rejected by PayHero", status: res.status, raw: data }, 401);
    } catch (err) {
      return json({ ok: false, message: `Cannot reach PayHero: ${err.message}` }, 502);
    }
  }

  return json({ error: "Unknown action. Use 'push', 'status', or 'test'." }, 400);
};
