import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getBearerToken(req: Request): string | null {
  const authHeader =
    req.headers.get("Authorization") ||
    req.headers.get("authorization") ||
    "";
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1]) {
    return null;
  }
  return parts[1];
}

function respond(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface SketchPromptParams {
  raceName: string;
  month: string | null;
  location?: string;
  distanceKm?: number;
  elevationGainM?: number;
  terrain?: string;
  keyFacts?: string;
  description?: string;
}

function buildSketchPrompt(p: SketchPromptParams): string {
  const locationDesc = p.terrain
    ? `${p.location ? p.location + " — " : ""}${p.terrain}`
    : p.location ?? "mountain trail terrain";

  const header = p.month
    ? `bold dark blue sans-serif text "${p.raceName}", with centered smaller sans-serif sub-text "${p.month}" below`
    : `bold dark blue sans-serif text "${p.raceName}"`;

  const distanceClause = p.distanceKm
    ? ` A bold dark blue hand-drawn course line winds a ${p.distanceKm}km loop across the sketch, starting and returning to the city center.`
    : " A bold dark blue hand-drawn course line winds across the sketch.";

  const elevationClause = p.elevationGainM
    ? ` The course gains ${p.elevationGainM}m of elevation.`
    : "";

  const keyFactsClause = p.keyFacts
    ? ` Course characteristics: ${p.keyFacts}`
    : "";

  const descriptionClause = p.description
    ? ` Additional context: ${p.description}`
    : "";

  return [
    "A detailed architectural pencil and ink sketch, hand-drawn style, on textured, cream-colored linen art paper.",
    "Set against a textured grey background with side shadows.",
    `Top-left corner, aligned left: ${header}.`,
    `The central and right portions show an intricate topographic pencil sketch of ${locationDesc} and the surrounding landscape.`,
    "The sketch features dense cross-hatching, contour lines, and detailed terrain elements such as glaciers, forests, and rock formations where applicable.",
    distanceClause + elevationClause,
    "The map is covered by a dense, organized network of small hand-pencil-style labels with thin leader lines: geological features with heights, START/FINISH CP, and intermediate checkpoints distributed along the route.",
    keyFactsClause + descriptionClause,
    "All label text is correctly spelled and legible. Professional, high-resolution scan quality. Meticulous technical document aesthetic. No photorealistic people, no photography style.",
  ].filter((s) => s.trim()).join(" ");
}

async function generateImage(
  prompt: string,
  apiKey: string,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const model =
    Deno.env.get("GEMINI_IMAGE_MODEL") ?? "gemini-3-pro-image-preview";

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "16:9" },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const result = await res.json();

  const parts = result?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find(
    (p: { inlineData?: { data?: string; mimeType?: string } }) =>
      p.inlineData?.data,
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error(`No image in Gemini response: ${JSON.stringify(result)}`);
  }

  const mimeType: string = imagePart.inlineData.mimeType ?? "image/png";
  const binaryString = atob(imagePart.inlineData.data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return { bytes, mimeType };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return respond({ imageUrl: null, error: "Server configuration error" }, 500);
    }
    if (!geminiApiKey) {
      console.error("Missing GEMINI_API_KEY");
      return respond(
        { imageUrl: null, error: "Image generation not configured — GEMINI_API_KEY missing" },
        503,
      );
    }

    const token = getBearerToken(req);
    if (!token) {
      return respond({ imageUrl: null, error: "Missing bearer token" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return respond({ imageUrl: null, error: "Unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json();
    const {
      raceId,
      raceName,
      location,
      distanceKm,
      elevationGainM,
      terrain,
      keyFacts,
      description,
      raceDate,
    } = body ?? {};

    if (!raceId || !raceName) {
      return respond(
        { imageUrl: null, error: "raceId and raceName are required" },
        400,
      );
    }

    const month = raceDate
      ? new Date(raceDate).toLocaleString("en-US", { month: "long", timeZone: "UTC" })
      : null;

    const prompt = buildSketchPrompt({
      raceName,
      month,
      location,
      distanceKm,
      elevationGainM,
      terrain,
      keyFacts,
      description,
    });

    console.log("race-image prompt:", prompt);

    const { bytes, mimeType } = await generateImage(prompt, geminiApiKey);

    const ext = mimeType.includes("png") ? "png" : "jpg";
    const storagePath = `${userId}/${raceId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("race-images")
      .upload(storagePath, bytes, { contentType: mimeType, upsert: true });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("race-images")
      .getPublicUrl(storagePath);

    const imageUrl = urlData.publicUrl;

    await supabase
      .from("races")
      .update({ image_url: imageUrl })
      .eq("id", raceId)
      .eq("user_id", userId);

    return respond({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("race-image error:", message);
    return respond({ imageUrl: null, error: message }, 500);
  }
});
