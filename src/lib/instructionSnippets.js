/**
 * Instruction mandate snippets — canonical text shared for unit test assertions.
 *
 * These strings match (or are extracted from) the system instruction clauses
 * in supabase/functions/gemini-coach/index.ts.
 *
 * They are NOT imported by the edge function (Deno runtime). They exist so
 * tests/unit/gemini-instructions.test.jsx can assert the mandate language is present.
 */

export const CITATION_MANDATE_SNIPPET =
  "Data citation requirement: At least one insight body (initial mode) or " +
  "coaching_feedback sentence (plan/replan modes) MUST cite an actual check-in " +
  "or daily-log value using the format \"Your [metric] of [value]/5 [interpretation]...\". " +
  "If no check-in or wellness log data is available, explicitly state: " +
  "\"No check-in or wellness data available this week — recommendations based on training load only.\"";

export const METHODOLOGY_MANDATE_SNIPPET =
  "Methodology alignment requirement: At least one insight body or coaching note " +
  "MUST explicitly mention long-run positioning in the week OR intensity distribution " +
  "(e.g., 80/20 easy/quality ratio). " +
  "Let the koop_weight/bakken_weight blend in the philosophy document guide emphasis: " +
  "higher koop_weight → emphasize long-run anchoring; higher bakken_weight → emphasize " +
  "specific intensity blocks.";

export const INSIGHTS_SYNTHESIS_INSTRUCTION_SNIPPET =
  "Write a single thorough paragraph (4-6 sentences) interpreting the athlete's current training state. " +
  "Cover current fitness trend (CTL direction), form/fatigue balance (TSB), consistency pattern, and one practical recommendation for the next 7-10 days.";
