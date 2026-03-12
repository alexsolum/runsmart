// Supabase Edge Function — Strava activity sync
// Reads the stored Strava tokens for the calling user, refreshes if
// expired, fetches recent activities, and upserts them into the
// activities table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

function missingEnvVars() {
  return [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRAVA_CLIENT_ID",
    "STRAVA_CLIENT_SECRET",
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
      // Activity zones may be unavailable for some activities.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const missingVars = missingEnvVars();
    if (missingVars.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Server misconfiguration: missing required Edge Function secrets",
          missing: missingVars,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          error: "Missing bearer token",
          hint: "Send Authorization: Bearer <supabase access_token> from the logged-in user session",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
    const user = userData?.user;

    if (userErr || !user) {
      const detail = userErr?.message || "Unauthorized";
      return new Response(
        JSON.stringify({
          error: detail,
          hint:
            "JWT validation failed. Verify frontend uses the same Supabase project URL+anon key as this Edge Function deployment.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load stored Strava connection
    const { data: conn, error: connErr } = await supabase
      .from("strava_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connErr || !conn) {
      return new Response(
        JSON.stringify({ error: "Strava is not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Refresh the access token if it has expired
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

      if (refreshData.errors || !refreshData.access_token) {
        const detail = refreshData.message
          || (refreshData.errors && refreshData.errors.map((e: { field?: string; code?: string }) => e.field + ": " + e.code).join(", "))
          || "unknown error";
        return new Response(
          JSON.stringify({ error: "Strava token refresh failed (" + detail + ") — try reconnecting" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      stravaAccessToken = refreshData.access_token;

      await supabase
        .from("strava_connections")
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: refreshData.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    // Parse request body for full sync flag and pagination
    let fullSync = false;
    let before = Math.floor(Date.now() / 1000);
    let pageLimit = 10; // Default to 10 pages (2000 activities) per call

    try {
      if (req.method === "POST") {
        const body = await req.json();
        fullSync = !!body.full;
        if (body.before) {
          before = body.before;
          // If explicit 'before' is provided, we're likely in a frontend-controlled loop
          pageLimit = 1;
        }
      }
    } catch (e) {
      // Ignore parse errors, default to false
    }

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
    let done = false;
    let synced = 0;
    let totalFound = 0;
    let firstError: string | null = null;
    let lastTimestamp = before;
    let pagesProcessed = 0;

    while (!done && pagesProcessed < pageLimit) {
      const stravaRes = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?before=${before}&per_page=200`,
        { headers: { Authorization: `Bearer ${stravaAccessToken}` } },
      );

      if (!stravaRes.ok) {
        const errorBody = await stravaRes.text();
        let detail = "";
        try {
          const parsed = JSON.parse(errorBody);
          detail = parsed.message || parsed.error || errorBody;
        } catch {
          detail = errorBody;
        }
        return new Response(
          JSON.stringify({
            error: "Strava API error (" + stravaRes.status + "): " + detail,
            synced,
            next_before: before,
            done: false,
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const activities = await stravaRes.json();
      if (!Array.isArray(activities) || activities.length === 0) {
        done = true;
        break;
      }

      pagesProcessed++;
      totalFound += activities.length;

      // Filter activities based on the sync mode
      const lastActivity = activities[activities.length - 1];
      lastTimestamp = Math.floor(new Date(lastActivity.start_date).getTime() / 1000);

      let chunkToProcess = activities;
      if (!fullSync && lastTimestamp < ninetyDaysAgo) {
        // Some activities in this chunk might be older than 90 days
        chunkToProcess = activities.filter((a: any) =>
          Math.floor(new Date(a.start_date).getTime() / 1000) >= ninetyDaysAgo
        );
        done = true; // Stop after this chunk
      }

      if (activities.length < 200) {
        done = true;
      }

      // Check which activities already exist to avoid redundant DB calls and zone fetches
      const stravaIds = chunkToProcess.map((a: any) => a.id);
      const { data: existingActivities } = await supabase
        .from("activities")
        .select("strava_id")
        .in("strava_id", stravaIds);

      const existingIds = new Set(existingActivities?.map((a: any) => a.strava_id) || []);

      for (const a of chunkToProcess) {
        if (existingIds.has(a.id)) {
          continue;
        }

        let heartRateZoneData = {
          heart_rate_zone_times: null,
          hr_zone_1_seconds: null,
          hr_zone_2_seconds: null,
          hr_zone_3_seconds: null,
          hr_zone_4_seconds: null,
          hr_zone_5_seconds: null,
        };

        // Only fetch heart rate zones for non-full-history sync (recent activities)
        const isRecent = Math.floor(new Date(a.start_date).getTime() / 1000) >= ninetyDaysAgo;
        if (!fullSync && isRecent && a.has_heartrate && a.id) {
          try {
            const zones = await fetchActivityHeartRateZones(stravaAccessToken, a.id);
            if (zones) {
              heartRateZoneData = zones;
            }
          } catch (zoneErr) {
            console.warn(zoneErr instanceof Error ? zoneErr.message : String(zoneErr));
          }
        }

        const { error } = await supabase.from("activities").upsert(
          {
            user_id: user.id,
            strava_id: a.id,
            name: a.name,
            type: a.type,
            distance: a.distance,
            duration: a.moving_time,
            elevation_gain: a.total_elevation_gain,
            average_pace:
              a.distance > 0 ? a.moving_time / (a.distance / 1000) : null,
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

        if (!error) {
          synced++;
        } else if (!firstError) {
          firstError = error.message;
        }
      }

      if (!done && pagesProcessed < pageLimit) {
        before = lastTimestamp;
        await sleep(1000);
      }
    }

    if (synced === 0 && totalFound > 0 && !fullSync && pagesProcessed === pageLimit) {
      // If we processed some but found no NEW ones, and we hit pageLimit, it's not necessarily an error
    } else if (synced === 0 && totalFound > 0 && !fullSync) {
      if (firstError) {
        return new Response(
          JSON.stringify({
            error: "Failed to save activities: " + firstError,
            synced: 0,
            total: totalFound,
            next_before: lastTimestamp,
            done,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({ synced, total: totalFound, next_before: lastTimestamp, done }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
