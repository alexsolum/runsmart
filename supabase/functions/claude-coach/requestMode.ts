export function getCoachRequestMode(payload: Record<string, unknown> | null | undefined): string {
  if (!payload || typeof payload !== "object") return "chat";

  const explicitMode = typeof payload.mode === "string" ? payload.mode : null;
  if (explicitMode) return explicitMode;

  const hasChatFields =
    typeof payload.sessionId === "string" && payload.sessionId.trim() &&
    typeof payload.newMessage === "string" && payload.newMessage.trim();

  if (hasChatFields) return "chat";

  const hasLegacyRaceName =
    typeof payload.raceName === "string" && payload.raceName.trim();

  if (hasLegacyRaceName) return "race_info";

  return "chat";
}
