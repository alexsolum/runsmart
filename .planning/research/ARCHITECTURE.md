# Architecture Research (Milestone: Coach Integration)

## Proposed Component Boundaries
- Frontend UI
  - Philosophy admin editor (restricted surface).
  - Replan trigger surfaces (long-term and weekly plans).
  - Insights overlays/comments display.
- Application hooks/state
  - Extend existing hooks for philosophy fetch/update and coach summaries.
- Edge function orchestration
  - `gemini-coach` reads active philosophy and training context.
  - Returns structured outputs for planning + chart overlays + insight summary.
- Data layer
  - Philosophy table(s) for editable doctrine.
  - Existing activity/check-in/log/plan tables remain primary context inputs.

## Data Flow
1. User logs training + check-ins + daily logs.
2. User triggers replan.
3. Frontend sends normalized context to `gemini-coach`.
4. Edge function merges context with active philosophy content.
5. Coach response updates plan artifacts and insight payloads.
6. UI renders updated plan, chart overlays, and overall insights comment.

## Build Order Suggestion
1. Add philosophy persistence + admin update path.
2. Integrate philosophy into `gemini-coach`.
3. Wire replan flow to richer context payload.
4. Add Training Load Trend coach overlays.
5. Add Insights overall coach synthesis comment.
