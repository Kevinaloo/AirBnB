// netlify/functions/whatsapp.js
// Server-side proxy to the Meta WhatsApp Cloud API — the access token
// never reaches the browser.
//
// Required Netlify environment variables:
//   WHATSAPP_TOKEN            — permanent access token from Meta Business Manager
//   WHATSAPP_PHONE_NUMBER_ID  — the "Phone number ID" of your WhatsApp Business number
//
// IMPORTANT REAL-WORLD CAVEAT (read this before relying on it in production):
// WhatsApp only allows free-form text messages within a 24-hour window of
// the customer last messaging you. Booking confirmations sent right after
// a guest pays usually work fine as free-form text since the guest has
// likely interacted with the AI concierge or WhatsApp "inquire" link
// recently. But for messages sent outside that 24h window — like a
// check-in reminder two days after booking, with no contact in between —
// Meta requires a pre-approved "message template" instead of free text,
// or the send will fail. Get templates approved once in Meta Business
// Manager (Account Tools → Message Templates) and pass templateName +
// templateParams instead of `body` to use them. This function supports
// both modes — see the two branches below.

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

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return new Response(
      JSON.stringify({ error: "WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set in Netlify environment variables." }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const { to, message, templateName, templateParams, languageCode } = body || {};
  if (!to) {
    return new Response(JSON.stringify({ error: "Missing 'to' (phone number, digits only with country code)" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
  if (!message && !templateName) {
    return new Response(JSON.stringify({ error: "Provide either 'message' (free text) or 'templateName' (approved template)" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const cleanTo = String(to).replace(/[^\d]/g, "");

  const payload = templateName
    ? {
        messaging_product: "whatsapp",
        to: cleanTo,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode || "en" },
          components: templateParams?.length
            ? [{ type: "body", parameters: templateParams.map((p) => ({ type: "text", text: String(p) })) }]
            : [],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: cleanTo,
        type: "text",
        text: { body: message, preview_url: false },
      };

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || "WhatsApp send failed", details: data }), {
        status: res.status, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `WhatsApp proxy error: ${err.message}` }), {
      status: 502, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/api/whatsapp" };
