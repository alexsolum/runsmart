# Research Summary

## Milestone Focus
Integrate AI Coach across long-term replanning, check-in feedback loops, and analytics insights, while introducing an editable coaching philosophy aligned with Jason Koop and Marius Bakken principles.

## Key Findings
- Best path is additive architecture on the current React + Supabase foundation.
- Core differentiator is a structured, editable philosophy source used at runtime.
- Manual-trigger replanning should remain explicit and transparent.
- First analytics integration target should be Training Load Trend overlays plus overall Insights synthesis comment.

## Recommended Delivery Sequence
1. Philosophy persistence + admin editing controls.
2. Runtime philosophy injection in `gemini-coach`.
3. Replan flow context/rationale improvements.
4. Chart overlays and insights-level coach synthesis output.

## Risks To Watch
- Prompt bloat and schema instability from unstructured philosophy content.
- Low trust if replan changes are not explained.
- Security leakage in admin edit path.
