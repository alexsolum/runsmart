interface RaceSection {
  key: string;
  title: string;
  content: string;
}

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
  sections?: RaceSection[];
  unknown?: boolean;
  wikipediaTitle?: string | null;
}

function isValidSection(value: unknown): value is RaceSection {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return typeof s.key === "string" && typeof s.title === "string" && typeof s.content === "string";
}

function isValidRaceInfo(value: unknown): value is RaceInfo {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  if (candidate.unknown === true) return true;

  if (typeof candidate.displayName !== "string" || typeof candidate.distanceKm !== "number") {
    return false;
  }

  if (candidate.sections !== undefined) {
    if (!Array.isArray(candidate.sections)) return false;
    for (const s of candidate.sections) {
      if (!isValidSection(s)) return false;
    }
  }

  return true;
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
