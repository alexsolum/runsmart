interface RaceInfo {
  displayName: string;
  distanceKm: number;
  elevationGainM?: number | null;
  terrain?: string | null;
  location?: string | null;
  keyFacts?: string | null;
  description?: string | null;
  registrationInfo?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  nextRaceDate?: string | null;
  raceUrl?: string | null;
  unknown?: boolean;
}

function isValidRaceInfo(value: unknown): value is RaceInfo {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  if (candidate.unknown === true) return true;

  return typeof candidate.displayName === "string" &&
    typeof candidate.distanceKm === "number";
}

function tryParse(candidate: string): RaceInfo | null {
  try {
    const parsed = JSON.parse(candidate);
    return isValidRaceInfo(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parseRaceInfoResponse(text: string): RaceInfo | null {
  const direct = tryParse(text);
  if (direct) return direct.unknown ? null : direct;

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    const fenced = tryParse(fencedMatch[1]);
    if (fenced) return fenced.unknown ? null : fenced;
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    const extracted = tryParse(objectMatch[0]);
    if (extracted) return extracted.unknown ? null : extracted;
  }

  return null;
}
