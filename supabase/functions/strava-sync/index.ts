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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authenticate the calling user
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);

    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
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
    let accessToken = conn.access_token;

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

      accessToken = refreshData.access_token;

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

    // Fetch activities from the last 90 days
    const after = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
    const stravaRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
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
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const activities = await stravaRes.json();

    if (!Array.isArray(activities)) {
      return new Response(
        JSON.stringify({ error: "Unexpected response from Strava: expected array of activities" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Upsert each activity
    let synced = 0;
    let firstError: string | null = null;
    for (const a of activities) {
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

    if (synced === 0 && activities.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Failed to save activities: " + (firstError || "unknown database error"),
          synced: 0,
          total: activities.length,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ synced, total: activities.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
