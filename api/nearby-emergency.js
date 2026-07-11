// netlify/functions/nearby-emergency.js
// Server-side proxy to Google Places API (New) — the API key never
// reaches the browser. Given a guest's coordinates, returns the closest
// open/operating hospitals and police stations.
//
// Required Netlify environment variable:
//   GOOGLE_PLACES_API_KEY — from Google Cloud Console, with the
//   "Places API (New)" enabled and billing set up on that project.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RADIUS_METERS = 6000; // ~6km — wide enough for most neighbourhoods, narrow enough to stay relevant

async function searchType(apiKey, type, lat, lng) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.businessStatus",
        "places.currentOpeningHours.openNow",
      ].join(","),
    },
    body: JSON.stringify({
      includedTypes: [type],
      maxResultCount: 5,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: RADIUS_METERS },
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Places API ${res.status}`);

  const toRad = (d) => (d * Math.PI) / 180;
  const distanceKm = (lat2, lng2) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat);
    const dLng = toRad(lng2 - lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  return (data.places || [])
    .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY" && p.businessStatus !== "CLOSED_TEMPORARILY")
    .map((p) => ({
      name: p.displayName?.text || "Unnamed",
      address: p.formattedAddress || "",
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
      lat: p.location?.latitude,
      lng: p.location?.longitude,
      openNow: p.currentOpeningHours?.openNow ?? null,
      distanceKm: p.location ? Math.round(distanceKm(p.location.latitude, p.location.longitude) * 10) / 10 : null,
    }))
    .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
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

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_PLACES_API_KEY not set in Netlify environment variables." }),
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

  const { lat, lng } = body || {};
  if (typeof lat !== "number" || typeof lng !== "number") {
    return new Response(JSON.stringify({ error: "Provide numeric lat and lng" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const [hospitals, police] = await Promise.all([
      searchType(apiKey, "hospital", lat, lng),
      searchType(apiKey, "police", lat, lng),
    ]);
    return new Response(JSON.stringify({ hospitals, police }), {
      status: 200, headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Places lookup failed: ${err.message}` }), {
      status: 502, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
};

