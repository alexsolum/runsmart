import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { getUserIdFromJwt } from "../../supabase/functions/claude-coach/auth.ts";

function encodeBase64Url(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

describe("claude-coach auth", () => {
  it("extracts the user id from a JWT payload sub claim", () => {
    const token = [
      encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" })),
      encodeBase64Url(JSON.stringify({ sub: "user-123" })),
      "signature",
    ].join(".");

    expect(getUserIdFromJwt(token)).toBe("user-123");
  });

  it("returns null for malformed tokens", () => {
    expect(getUserIdFromJwt("not-a-jwt")).toBeNull();
  });

  it("disables gateway JWT verification for claude-coach in supabase config", () => {
    const configPath = path.resolve(
      process.cwd(),
      "supabase/config.toml",
    );
    const config = fs.readFileSync(configPath, "utf8");

    expect(config).toMatch(/\[functions\.claude-coach\][\s\S]*verify_jwt\s*=\s*false/);
  });
});
