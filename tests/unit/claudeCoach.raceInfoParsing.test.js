import { describe, expect, it } from "vitest";
import { parseRaceInfoResponse } from "../../supabase/functions/claude-coach/raceInfo.ts";

describe("parseRaceInfoResponse", () => {
  it("parses a plain JSON race payload", () => {
    const parsed = parseRaceInfoResponse(
      '{"displayName":"UTMB","distanceKm":171,"elevationGainM":10000,"terrain":"Mountain trail","location":"Chamonix, France","keyFacts":"Long climbs and descents."}',
    );

    expect(parsed?.displayName).toBe("UTMB");
    expect(parsed?.distanceKm).toBe(171);
  });

  it("parses fenced JSON returned by a weaker model", () => {
    const parsed = parseRaceInfoResponse(
      '```json\n{"displayName":"Berlin Marathon","distanceKm":42.2,"elevationGainM":null,"terrain":"Road","location":"Berlin, Germany","keyFacts":"Fast and flat."}\n```',
    );

    expect(parsed?.displayName).toBe("Berlin Marathon");
    expect(parsed?.distanceKm).toBe(42.2);
  });

  it("parses JSON preceded by a short explanatory line", () => {
    const parsed = parseRaceInfoResponse(
      'Here is the race info:\n{"displayName":"CCC","distanceKm":101,"elevationGainM":6100,"terrain":"Mountain trail","location":"Courmayeur to Chamonix","keyFacts":"Extended climbing and technical descents."}',
    );

    expect(parsed?.displayName).toBe("CCC");
    expect(parsed?.distanceKm).toBe(101);
  });

  it("returns null when the model marks the race as unknown", () => {
    expect(parseRaceInfoResponse('{"unknown":true}')).toBeNull();
  });
});
