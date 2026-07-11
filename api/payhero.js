// netlify/functions/payhero.js
// Server-side proxy for PayHero (M-Pesa) so PAYHERO_USERNAME and
// PAYHERO_PASSWORD never appear in the browser JavaScript bundle.
//
// Required Netlify environment variables (NO "VITE_" prefix — server only):
//   PAYHERO_USERNAME
//   PAYHERO_PASSWORD
//   PAYHERO_CHANNEL_ID

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const user    = process.env.PAYHERO_USERNAME;
  const pass    = process.env.PAYHERO_PASSWORD;
  const channel = process.env.PAYHERO_CHANNEL_ID;

  if (!user || !pass || !channel) {
    return new Response(
      JSON.stringify({ error: "PayHero credentials not configured. Set PAYHERO_USERNAME, PAYHERO_PASSWORD, and PAYHERO_CHANNEL_ID in Netlify environment variables." }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }); }

  const { action, amount, phone, reference } = body || {};

  // ── STK Push (initiate payment) ───────────────────────────────
  if (action === "push") {
    if (!amount || !phone || !reference) {
      return new Response(JSON.stringify({ error: "Missing amount, phone, or reference" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    try {
      const res = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Basic ${auth}` },
        body: JSON.stringify({
          amount: Number(amount),
          phone_number: String(phone),
          channel_id: Number(channel),
          provider: "m-pesa",
          external_reference: reference,
          callback_url: "https://softcash.co.ke/banking-side/mpesa-callback.php",
        }),
      });
      const data = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(data), {
        status: res.status, headers: { ...CORS, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: `PayHero push failed: ${err.message}` }), {
        status: 502, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
  }

  // ── Transaction status check ──────────────────────────────────
  if (action === "status") {
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    try {
      const res = await fetch(
        `https://backend.payhero.co.ke/api/v2/transaction-status?reference=${encodeURIComponent(reference)}`,
        { headers: { "Authorization": `Basic ${auth}` } }
      );
      const data = await res.json().catch(() => ({}));
      return new Response(JSON.stringify(data), {
        status: res.status, headers: { ...CORS, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: `PayHero status check failed: ${err.message}` }), {
        status: 502, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ error: "Unknown action. Use 'push' or 'status'." }), {
    status: 400, headers: { ...CORS, "Content-Type": "application/json" },
  });
};

