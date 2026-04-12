# Race Image Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic sports-photography image prompt with an artistic topographic pencil-sketch prompt built from rich race data fetched via claude-coach.

**Architecture:** When a race is created without an image, `useRaces.js` first calls `claude-coach` in `race_info` mode to get terrain/keyFacts/elevation data, then passes that enriched payload to `race-image`. The `race-image` edge function builds a detailed artistic sketch prompt from all available fields and calls Gemini. Both steps are best-effort: failures are silently swallowed so race creation always succeeds.

**Tech Stack:** React hooks (useRaces.js), Supabase Edge Functions (Deno/TypeScript), Gemini image generation API

---

## Files

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `supabase/functions/race-image/index.ts` | Accept new body fields; build artistic sketch prompt |
| Modify | `src/hooks/useRaces.js` | Add race_info lookup before calling race-image |

> Note: Edge functions in this codebase have no unit test suite (Deno runtime, not importable by Vitest). Verification is via manual testing after deploy. `useRaces.js` hooks are also not unit-tested in the existing suite — no tests exist to update.

---

## Task 1: Update race-image edge function

**Files:**
- Modify: `supabase/functions/race-image/index.ts`

- [ ] **Step 1: Replace the entire contents of `supabase/functions/race-image/index.ts`**

  Read the file first to confirm current state matches what you expect, then replace with:

  ```typescript
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
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add supabase/functions/race-image/index.ts
  git commit -m "feat: build artistic topographic sketch prompt in race-image"
  ```

---

## Task 2: Enrich the race-image call in useRaces.js

**Files:**
- Modify: `src/hooks/useRaces.js`

- [ ] **Step 1: Replace the background image-generation block in `createRace`**

  In `src/hooks/useRaces.js`, find this block (lines 84–105):

  ```js
  if (!raceData.image_url) {
    client.functions
      .invoke("race-image", {
        body: {
          raceId: data.id,
          raceName: data.name,
          location: data.location ?? undefined,
          distanceKm: data.distance_km ?? undefined,
        },
      })
      .then(({ data: imgData }) => {
        if (imgData?.imageUrl) {
          dispatch({
            type: "updated",
            payload: { ...data, image_url: imgData.imageUrl },
          });
        }
      })
      .catch(() => {
        // Image generation is best-effort — silently ignore failures.
      });
  }
  ```

  Replace it with:

  ```js
  if (!raceData.image_url) {
    (async () => {
      // Step 1: fetch race info via claude-coach (best-effort enrichment)
      let raceInfo = null;
      try {
        const { data: infoData } = await client.functions.invoke("claude-coach", {
          body: { raceName: data.name },
        });
        raceInfo = infoData?.raceInfo ?? null;
      } catch {
        // race_info lookup failed — proceed without enrichment
      }

      // Step 2: generate image with all available data
      const { data: imgData } = await client.functions.invoke("race-image", {
        body: {
          raceId: data.id,
          raceName: data.name,
          location: data.location ?? raceInfo?.location ?? undefined,
          distanceKm: data.distance_km ?? raceInfo?.distanceKm ?? undefined,
          elevationGainM: data.elevation_gain_m ?? raceInfo?.elevationGainM ?? undefined,
          terrain: raceInfo?.terrain ?? undefined,
          keyFacts: raceInfo?.keyFacts ?? undefined,
          description: data.description ?? undefined,
          raceDate: data.next_race_date ?? undefined,
        },
      });

      if (imgData?.imageUrl) {
        dispatch({
          type: "updated",
          payload: { ...data, image_url: imgData.imageUrl },
        });
      }
    })().catch(() => {
      // Image generation is best-effort — silently ignore failures.
    });
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/hooks/useRaces.js
  git commit -m "feat: enrich race-image call with claude-coach race_info data"
  ```

---

## Task 3: Deploy and verify

**Files:** (none — deploy only)

- [ ] **Step 1: Deploy the race-image edge function**

  ```bash
  npx supabase functions deploy race-image
  ```

  Expected output: `Deployed Functions race-image`

- [ ] **Step 2: Open the app and create a test race with a well-known name**

  Run `npm run dev`, navigate to the Races page, and create a race with:
  - Name: `UTMB` (or another well-known ultra — this ensures claude-coach returns rich terrain/keyFacts)
  - Leave the image field empty

  Expected behaviour:
  1. Race card appears immediately (no image yet)
  2. After ~10–20 seconds the card image updates to a pencil-sketch style topographic illustration
  3. Check Supabase edge function logs (`npx supabase functions logs race-image --tail`) — you should see the prompt logged: `race-image prompt: A detailed architectural pencil and ink sketch...`

- [ ] **Step 3: Verify fallback — create a race with an unknown name**

  Create a race with:
  - Name: `My Local 5k`
  - Leave image field empty

  Expected: Race still gets an image (generic mountain sketch), not a blank card. The race_info lookup returns null and the prompt falls back gracefully to the location/name alone.

- [ ] **Step 4: Verify no regression on races created with a manual image URL**

  Create a race with an `image_url` already filled in.

  Expected: Neither the claude-coach call nor the race-image call fires — the existing image is preserved unchanged.
