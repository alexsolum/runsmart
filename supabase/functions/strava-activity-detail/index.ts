import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getBearerToken(req: Request) {
  const authHeader =
    req.headers.get("Authorization") ||
    req.headers.get("authorization") ||
    "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Missing bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
    const user = userData?.user;

    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const activityId = body.activity_id;
    if (!activityId) {
      return new Response(
        JSON.stringify({ error: "activity_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check cache
    const { data: cached } = await supabase
      .from("strava_activity_cache")
      .select("data, cached_at")
      .eq("user_id", user.id)
      .eq("strava_activity_id", activityId)
      .maybeSingle();

    if (cached) {
      const age = Date.now() - new Date(cached.cached_at).getTime();
      if (age < CACHE_TTL_MS) {
        return new Response(
          JSON.stringify({ ...cached.data, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Load Strava connection
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

    // Refresh token if expired
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
      if (!refreshData.access_token) {
        return new Response(
          JSON.stringify({ error: "Strava token refresh failed" }),
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

    // Fetch activity detail
    const activityRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      { headers: { Authorization: `Bearer ${stravaAccessToken}` } },
    );

    if (!activityRes.ok) {
      return new Response(
        JSON.stringify({ error: `Strava API error: ${activityRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const activity = await activityRes.json();

    // Fetch photos
    let photos: { url: string; caption: string }[] = [];
    try {
      const photosRes = await fetch(
        `https://www.strava.com/api/v3/activities/${activityId}/photos?size=600`,
        { headers: { Authorization: `Bearer ${stravaAccessToken}` } },
      );
      if (photosRes.ok) {
        const photosData = await photosRes.json();
        if (Array.isArray(photosData)) {
          photos = photosData.map((p: any) => ({
            url: p.urls?.["600"] || p.urls?.["0"] || "",
            caption: p.caption || "",
          }));
        }
      }
    } catch {
      // Photos are optional
    }

    const result = {
      description: activity.description || null,
      map_polyline: activity.map?.summary_polyline || null,
      splits: (activity.splits_metric || []).map((s: any) => ({
        split: s.split,
        distance: s.distance,
        elapsed_time: s.elapsed_time,
        average_speed: s.average_speed,
        average_heartrate: s.average_heartrate,
        elevation_difference: s.elevation_difference,
      })),
      photos,
      stats: {
        average_heartrate: activity.average_heartrate || null,
        max_heartrate: activity.max_heartrate || null,
        average_speed: activity.average_speed || null,
        max_speed: activity.max_speed || null,
        calories: activity.calories || null,
        suffer_score: activity.suffer_score || null,
        gear_name: activity.gear?.name || null,
      },
    };

    // Upsert cache
    await supabase
      .from("strava_activity_cache")
      .upsert(
        {
          user_id: user.id,
          strava_activity_id: activityId,
          data: result,
          cached_at: new Date().toISOString(),
        },
        { onConflict: "user_id,strava_activity_id" },
      );

    return new Response(
      JSON.stringify({ ...result, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
