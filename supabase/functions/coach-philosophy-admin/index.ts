import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PhilosophyPayload = {
  principles: string;
  dos: string;
  donts: string;
  workout_examples: string;
  phase_notes: string;
  koop_weight: number;
  bakken_weight: number;
};

function missingEnvVars() {
  return ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((key) => !Deno.env.get(key));
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function normalizePayload(input: Partial<PhilosophyPayload>): PhilosophyPayload {
  return {
    principles: String(input.principles || "").trim(),
    dos: String(input.dos || "").trim(),
    donts: String(input.donts || "").trim(),
    workout_examples: String(input.workout_examples || "").trim(),
    phase_notes: String(input.phase_notes || "").trim(),
    koop_weight: Number(input.koop_weight ?? 50),
    bakken_weight: Number(input.bakken_weight ?? 50),
  };
}

function validatePayload(payload: PhilosophyPayload): string[] {
  const errors: string[] = [];
  if (!payload.principles) errors.push("principles is required");
  if (!payload.dos) errors.push("dos is required");
  if (!payload.donts) errors.push("donts is required");
  if (!payload.workout_examples) errors.push("workout_examples is required");
  if (!payload.phase_notes) errors.push("phase_notes is required");
  if (!Number.isFinite(payload.koop_weight) || payload.koop_weight < 0 || payload.koop_weight > 100) {
    errors.push("koop_weight must be between 0 and 100");
  }
  if (!Number.isFinite(payload.bakken_weight) || payload.bakken_weight < 0 || payload.bakken_weight > 100) {
    errors.push("bakken_weight must be between 0 and 100");
  }
  return errors;
}

async function logAudit(
  supabase: ReturnType<typeof createClient>,
  args: { userId?: string | null; action: string; status: "allowed" | "denied" | "error"; details?: Record<string, unknown> },
) {
  await supabase.from("coach_admin_audit").insert({
    user_id: args.userId ?? null,
    action: args.action,
    status: args.status,
    details: args.details ?? {},
  });
}

async function ensureAdminAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ ok: boolean; role: "owner" | "admin" | null }> {
  const { count } = await supabase
    .from("coach_admins")
    .select("user_id", { head: true, count: "exact" });

  // Single-user bootstrap: first authenticated user becomes owner.
  if (!count || count === 0) {
    const { error: bootstrapErr } = await supabase
      .from("coach_admins")
      .insert({ user_id: userId, role: "owner", created_by: userId });

    if (bootstrapErr) return { ok: false, role: null };
    return { ok: true, role: "owner" };
  }

  const { data, error } = await supabase
    .from("coach_admins")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return { ok: false, role: null };
  if (data.role !== "owner" && data.role !== "admin") return { ok: false, role: null };
  return { ok: true, role: data.role };
}

async function getCurrentDocument(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from("coach_philosophy_documents")
    .select("*")
    .eq("scope", "global")
    .maybeSingle();
  if (error) throw error;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const missingVars = missingEnvVars();
    if (missingVars.length > 0) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: missing required secrets", missing: missingVars }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      await logAudit(supabase, {
        action: "auth",
        status: "denied",
        details: { reason: "missing_bearer" },
      });
      return new Response(
        JSON.stringify({ error: "Missing bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken);
    const user = userData?.user;
    if (userErr || !user) {
      await logAudit(supabase, { action: "auth", status: "denied", details: { reason: "invalid_jwt" } });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { action, payload, changelog_note, version_id } = await req.json();
    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "read") {
      const doc = await getCurrentDocument(supabase);
      const { data: versions } = await supabase
        .from("coach_philosophy_versions")
        .select("*")
        .order("version", { ascending: false })
        .limit(20);
      return new Response(
        JSON.stringify({ document: doc, versions: versions ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const access = await ensureAdminAccess(supabase, user.id);
    if (!access.ok) {
      await logAudit(supabase, {
        userId: user.id,
        action: String(action),
        status: "denied",
        details: { reason: "not_admin" },
      });
      return new Response(
        JSON.stringify({ error: "Not authorized to modify coaching philosophy." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "save_draft") {
      const normalized = normalizePayload(payload || {});
      const validationErrors = validatePayload(normalized);
      if (validationErrors.length > 0) {
        await logAudit(supabase, {
          userId: user.id,
          action,
          status: "denied",
          details: { errors: validationErrors },
        });
        return new Response(
          JSON.stringify({ error: "Validation failed", errors: validationErrors }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const current = await getCurrentDocument(supabase);
      const nextVersion = Math.max(Number(current?.version || 0), 1);
      const { data, error } = await supabase
        .from("coach_philosophy_documents")
        .upsert({
          scope: "global",
          status: "draft",
          version: nextVersion,
          principles: normalized.principles,
          dos: normalized.dos,
          donts: normalized.donts,
          workout_examples: normalized.workout_examples,
          phase_notes: normalized.phase_notes,
          koop_weight: normalized.koop_weight,
          bakken_weight: normalized.bakken_weight,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
          created_by: current?.created_by ?? user.id,
        }, { onConflict: "scope" })
        .select("*")
        .single();

      if (error) throw error;
      await logAudit(supabase, { userId: user.id, action, status: "allowed", details: { version: data.version } });
      return new Response(
        JSON.stringify({ document: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "publish") {
      if (!String(changelog_note || "").trim()) {
        return new Response(
          JSON.stringify({ error: "changelog_note is required for publish" }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const current = await getCurrentDocument(supabase);
      if (!current) {
        return new Response(
          JSON.stringify({ error: "No philosophy draft found to publish" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const draft = normalizePayload(current as PhilosophyPayload);
      const validationErrors = validatePayload(draft);
      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({ error: "Validation failed", errors: validationErrors }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const nextVersion = Number(current.version || 0) + 1;
      const publishedAt = new Date().toISOString();
      const publishNote = String(changelog_note).trim();

      const { error: versionErr } = await supabase
        .from("coach_philosophy_versions")
        .insert({
          version: nextVersion,
          source: "publish",
          principles: current.principles,
          dos: current.dos,
          donts: current.donts,
          workout_examples: current.workout_examples,
          phase_notes: current.phase_notes,
          koop_weight: current.koop_weight,
          bakken_weight: current.bakken_weight,
          changelog_note: publishNote,
          published_by: user.id,
          published_at: publishedAt,
        });
      if (versionErr) throw versionErr;

      const { data, error } = await supabase
        .from("coach_philosophy_documents")
        .update({
          status: "published",
          version: nextVersion,
          changelog_note: publishNote,
          published_at: publishedAt,
          published_by: user.id,
          updated_at: publishedAt,
          updated_by: user.id,
        })
        .eq("scope", "global")
        .select("*")
        .single();
      if (error) throw error;

      await logAudit(supabase, { userId: user.id, action, status: "allowed", details: { version: nextVersion } });
      return new Response(
        JSON.stringify({ document: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "rollback") {
      if (!version_id) {
        return new Response(
          JSON.stringify({ error: "version_id is required for rollback" }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: targetVersion, error: versionErr } = await supabase
        .from("coach_philosophy_versions")
        .select("*")
        .eq("id", version_id)
        .maybeSingle();
      if (versionErr) throw versionErr;
      if (!targetVersion) {
        return new Response(
          JSON.stringify({ error: "Rollback target version not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const current = await getCurrentDocument(supabase);
      const nextVersion = Number(current?.version || 0) + 1;
      const rollbackNote = `Rollback to v${targetVersion.version}`;
      const publishedAt = new Date().toISOString();

      const { error: archiveErr } = await supabase
        .from("coach_philosophy_versions")
        .insert({
          version: nextVersion,
          source: "rollback",
          principles: targetVersion.principles,
          dos: targetVersion.dos,
          donts: targetVersion.donts,
          workout_examples: targetVersion.workout_examples,
          phase_notes: targetVersion.phase_notes,
          koop_weight: targetVersion.koop_weight,
          bakken_weight: targetVersion.bakken_weight,
          changelog_note: rollbackNote,
          published_by: user.id,
          published_at: publishedAt,
        });
      if (archiveErr) throw archiveErr;

      const { data, error } = await supabase
        .from("coach_philosophy_documents")
        .upsert({
          scope: "global",
          status: "published",
          version: nextVersion,
          principles: targetVersion.principles,
          dos: targetVersion.dos,
          donts: targetVersion.donts,
          workout_examples: targetVersion.workout_examples,
          phase_notes: targetVersion.phase_notes,
          koop_weight: targetVersion.koop_weight,
          bakken_weight: targetVersion.bakken_weight,
          changelog_note: rollbackNote,
          published_at: publishedAt,
          published_by: user.id,
          updated_at: publishedAt,
          updated_by: user.id,
          created_by: current?.created_by ?? user.id,
        }, { onConflict: "scope" })
        .select("*")
        .single();
      if (error) throw error;

      await logAudit(supabase, {
        userId: user.id,
        action,
        status: "allowed",
        details: { target_version_id: version_id, new_version: nextVersion },
      });
      return new Response(
        JSON.stringify({ document: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "export") {
      const doc = await getCurrentDocument(supabase);
      const payload = doc
        ? {
          exported_at: new Date().toISOString(),
          scope: doc.scope,
          status: doc.status,
          version: doc.version,
          principles: doc.principles,
          dos: doc.dos,
          donts: doc.donts,
          workout_examples: doc.workout_examples,
          phase_notes: doc.phase_notes,
          koop_weight: doc.koop_weight,
          bakken_weight: doc.bakken_weight,
          changelog_note: doc.changelog_note,
        }
        : null;
      return new Response(
        JSON.stringify({ export: payload }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
