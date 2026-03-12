// Supabase Edge Function — Strava webhook handler
// This function handles the Strava webhook handshake (GET) and
// processes real-time activity events (POST) like create, update, and delete.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function missingEnvVars() {
  return [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRAVA_CLIENT_ID",
    "STRAVA_CLIENT_SECRET",
    "STRAVA_VERIFY_TOKEN",
  ].filter((key) => !Deno.env.get(key));
}

type ZoneBucket = {
  min?: number;
  max?: number;
  time?: number;
};

type StravaZone = {
  type?: string;
  distribution_buckets?: ZoneBucket[];
};

function mapHeartRateZones(zones: StravaZone[]) {
  const heartRateZone = zones.find((zone) => zone.type === "heartrate");
  const buckets = heartRateZone?.distribution_buckets;

  if (!Array.isArray(buckets) || buckets.length === 0) {
    return {
      heart_rate_zone_times: null,
      hr_zone_1_seconds: null,
      hr_zone_2_seconds: null,
      hr_zone_3_seconds: null,
      hr_zone_4_seconds: null,
      hr_zone_5_seconds: null,
    };
  }

  const normalizedBuckets = buckets.map((bucket, index) => ({
    zone: index + 1,
    min: bucket.min ?? null,
    max: bucket.max ?? null,
    seconds: bucket.time ?? 0,
  }));

  return {
    heart_rate_zone_times: normalizedBuckets,
    hr_zone_1_seconds: normalizedBuckets[0]?.seconds ?? null,
    hr_zone_2_seconds: normalizedBuckets[1]?.seconds ?? null,
    hr_zone_3_seconds: normalizedBuckets[2]?.seconds ?? null,
    hr_zone_4_seconds: normalizedBuckets[3]?.seconds ?? null,
    hr_zone_5_seconds: normalizedBuckets[4]?.seconds ?? null,
  };
}

async function fetchActivityHeartRateZones(stravaAccessToken: string, activityId: number) {
  const zoneRes = await fetch(
    `https://www.strava.com/api/v3/activities/${activityId}/zones`,
    { headers: { Authorization: `Bearer ${stravaAccessToken}` } },
  );

  if (!zoneRes.ok) {
    if (zoneRes.status === 404) {
      return null;
    }
    throw new Error(`Failed fetching Strava zones for activity ${activityId}: ${zoneRes.status}`);
  }

  const zonesData = await zoneRes.json();
  if (!Array.isArray(zonesData)) {
    return null;
  }

  return mapHeartRateZones(zonesData);
}

async function processActivityEvent(payload: any) {
  const { object_id, object_type, aspect_type, owner_id } = payload;

  if (object_type !== "activity") return;

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log(`Processing ${aspect_type} event for activity ${object_id} (owner: ${owner_id})`);

  if (aspect_type === "delete") {
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("strava_id", object_id);
    
    if (error) {
      console.error(`Error deleting activity ${object_id}:`, error.message);
    } else {
      console.log(`Successfully deleted activity ${object_id}`);
    }
    return;
  }

  // aspect_type === "create" or "update"
  // 1. Find user by strava_athlete_id
  const { data: conn, error: connErr } = await supabase
    .from("strava_connections")
    .select("*")
    .eq("strava_athlete_id", owner_id)
    .single();

  if (connErr || !conn) {
    console.error(`No connection found for Strava athlete ${owner_id}`);
    return;
  }

  // 2. Refresh token if needed
  let stravaAccessToken = conn.access_token;
  if (conn.expires_at < Math.floor(Date.now() / 1000)) {
    const refreshRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("STRAVA_CLIENT_ID"),
        client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
        refresh_token: conn.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const refreshData = await refreshRes.json();
    if (refreshData.access_token) {
      stravaAccessToken = refreshData.access_token;
      await supabase
        .from("strava_connections")
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: refreshData.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", conn.user_id);
    } else {
      console.error(`Token refresh failed for athlete ${owner_id}`);
      return;
    }
  }

  // 3. Fetch DetailedActivity
  const activityRes = await fetch(
    `https://www.strava.com/api/v3/activities/${object_id}`,
    { headers: { Authorization: `Bearer ${stravaAccessToken}` } },
  );

  if (!activityRes.ok) {
    console.error(`Failed to fetch activity ${object_id} details: ${activityRes.status}`);
    return;
  }

  const a = await activityRes.json();

  // 4. Fetch Zones if heartrate available
  let heartRateZoneData = {
    heart_rate_zone_times: null,
    hr_zone_1_seconds: null,
    hr_zone_2_seconds: null,
    hr_zone_3_seconds: null,
    hr_zone_4_seconds: null,
    hr_zone_5_seconds: null,
  };

  if (a.has_heartrate) {
    try {
      const zones = await fetchActivityHeartRateZones(stravaAccessToken, a.id);
      if (zones) {
        heartRateZoneData = zones;
      }
    } catch (zoneErr) {
      console.warn(`Zone fetch failed for activity ${a.id}:`, zoneErr);
    }
  }

  // 5. Upsert to DB
  const { error } = await supabase.from("activities").upsert(
    {
      user_id: conn.user_id,
      strava_id: a.id,
      name: a.name,
      type: a.type,
      distance: a.distance,
      duration: a.moving_time,
      elevation_gain: a.total_elevation_gain,
      average_pace: a.distance > 0 ? a.moving_time / (a.distance / 1000) : null,
      average_heartrate: a.average_heartrate || null,
      started_at: a.start_date,
      moving_time: a.moving_time,
      elapsed_time: a.elapsed_time,
      heart_rate_zone_times: heartRateZoneData.heart_rate_zone_times,
      hr_zone_1_seconds: heartRateZoneData.hr_zone_1_seconds,
      hr_zone_2_seconds: heartRateZoneData.hr_zone_2_seconds,
      hr_zone_3_seconds: heartRateZoneData.hr_zone_3_seconds,
      hr_zone_4_seconds: heartRateZoneData.hr_zone_4_seconds,
      hr_zone_5_seconds: heartRateZoneData.hr_zone_5_seconds,
      source: "strava",
    },
    { onConflict: "strava_id" },
  );

  if (error) {
    console.error(`Error upserting activity ${a.id}:`, error.message);
  } else {
    console.log(`Successfully synced activity ${a.id} (${aspect_type})`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const missingVars = missingEnvVars();
    if (missingVars.length > 0) {
      console.error(`Missing env vars: ${missingVars.join(", ")}`);
      return new Response(
        JSON.stringify({ error: "Server misconfiguration", missing: missingVars }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);

    // Handshake (GET)
    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === Deno.env.get("STRAVA_VERIFY_TOKEN")) {
        console.log("Strava webhook handshake successful");
        return new Response(JSON.stringify({ "hub.challenge": challenge }), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        console.warn("Strava webhook handshake failed: invalid token or mode");
        return new Response("Forbidden", { status: 403 });
      }
    }

    // Event Handler (POST)
    if (req.method === "POST") {
      const payload = await req.json();
      const { object_type } = payload;

      if (object_type === "activity") {
        // Use EdgeRuntime.waitUntil to acknowledge the request immediately
        // while continuing processing in the background.
        // @ts-ignore: EdgeRuntime is available in Supabase Edge Functions
        EdgeRuntime.waitUntil(processActivityEvent(payload));
      }

      // Strava requires a 200 OK within 2 seconds
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (err) {
    console.error("Webhook error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
