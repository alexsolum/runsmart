# Research Summary — Weekly Planning Intelligence

## Stack Additions

- No major new framework is needed.
- The main technical addition is a unified weekly-planning payload plus a persistent weekly-preferences model.
- Keep AI recommendation assembly inside Supabase Edge Functions.

## Feature Table Stakes

- `Ukeplan` becomes the primary weekly AI planning surface.
- Weekly generation consumes macro plan intent, weekly mileage, and workout type.
- Athlete day-by-day constraints directly shape session placement.
- Recommendation output includes rationale, not just sessions.

## Architecture Direction

- Treat `Treningsplan` as macro intent and `Ukeplan` as tactical execution.
- Add an admin-guidance layer and an athlete-preference layer to the weekly recommendation context.
- Separate stored preferences from generated week entries so regeneration is safe.

## Watch Out For

- Do not leave weekly generation split across two pages.
- Do not silently violate or ignore constraints.
- Do not overwrite manual edits without an explicit rule.
- Do not let admin guidance remain loose freeform text if it must steer weekly recommendations.
