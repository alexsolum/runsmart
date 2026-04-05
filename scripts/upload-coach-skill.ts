#!/usr/bin/env npx tsx
/**
 * Upload the running coach skill to Anthropic.
 *
 * Usage: npx tsx scripts/upload-coach-skill.ts
 *
 * Requires ANTHROPIC_API_KEY env var.
 * Prints the skill_id to stdout on success.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, "../docs/running_coach");
const API_URL = "https://api.anthropic.com/v1/skills";
const BETA_HEADER = "skills-2025-10-02";

function collectFiles(dir: string, base: string = ""): Array<{ path: string; content: string }> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: Array<{ path: string; content: string }> = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = base ? `${base}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      // Skip output directory
      if (entry.name === "output") continue;
      files.push(...collectFiles(fullPath, relativePath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push({ path: relativePath, content: fs.readFileSync(fullPath, "utf-8") });
    }
  }

  return files;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY env var is required");
    process.exit(1);
  }

  const files = collectFiles(SKILL_DIR);
  // Sort so top-level files (no /) appear before subdirectory files
  files.sort((a, b) => {
    const aDepth = (a.path.match(/\//g) ?? []).length;
    const bDepth = (b.path.match(/\//g) ?? []).length;
    return aDepth - bDepth;
  });
  console.error(`Collected ${files.length} files from ${SKILL_DIR}`);

  for (const f of files) {
    console.error(`  - ${f.path} (${f.content.length} chars)`);
  }

  // All files need a common root directory prefix (e.g. "running_coach/SKILL.md")
  const rootDir = path.basename(SKILL_DIR); // "running_coach"
  const formData = new FormData();
  formData.append("display_title", "Running Coach");
  for (const f of files) {
    const filePath = `${rootDir}/${f.path}`;
    const file = new File([f.content], filePath, { type: "text/plain" });
    console.error(`  -> File name sent: "${file.name}"`);
    formData.append("files[]", file);
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": BETA_HEADER,
      // Note: do NOT set content-type — fetch sets it automatically with boundary for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API error ${response.status}: ${errorText}`);
    process.exit(1);
  }

  const result = await response.json();
  const skillId = result.id ?? result.skill_id;

  console.error(`\nSkill uploaded successfully!`);
  console.error(`Skill ID: ${skillId}`);
  console.error(`\nSet this as a Supabase secret:`);
  console.error(`  supabase secrets set CLAUDE_COACH_SKILL_ID=${skillId}`);

  // Print just the ID to stdout for scripting
  console.log(skillId);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
