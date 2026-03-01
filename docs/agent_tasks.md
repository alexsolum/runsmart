# RunSmart — AI Coach
Task: Build an AI Endurance Coach Integration
Objective: Create a coaching dashboard that uses Gemini AI to analyze historical training data and generate prospective 7-day training plans, featuring an interactive feedback loop for plan revisions.

Context: There already exists a coaching page that is not working and i want to make improvements.
There also exists a gemini edge function in supabase that can be used as a starting point (this has worked before). This is called gemini-coach. Make improvements as you see fit.

1. Technical Stack & Data Schema
LLM: Gemini 2.5 Flash (via API) for reasoning and structured output.

Backend/Database: Supabase.

Key Tables needed:

activities: Historical data (at least 4 weeks). Already exists in supabase.

coaching_sessions: Stores the chat_history (JSONB) and the latest current_plan. This needs to be created.

2. Core Functional Requirements
A. The Analysis Engine (Gemini Prompting)
The system must fetch the last 28 days of data from training_logs and the existing draft for the next 7 days. Gemini should be prompted to:
Context for the training plan can be found in the Supabase table "training_plans" and the data field "goal".

Identify trends (e.g., "You've increased volume by 15%, watch for fatigue").

Generate a Structured JSON Response for the next 7 days with these fields:

date, km, duration, description, workout_type (e.g., Recovery, Interval, Long Run).
Look up the fields in the Supabase table to verify that you have all needed fields to create a new weekly plan.

B. The Feedback Loop (The "Coach Chat")
Initial Trigger: A button to "Generate Weekly Plan."

Manual Revision: A chat input where the user can say, "I have a wedding on Saturday, move the long run to Sunday and make it easier."

Context Persistence: Send the full conversation history back to Gemini so it "remembers" previous constraints when generating the revised training_plan.

C. UI Components
Training Table: A display for the upcoming 7-day plan.

Chat History Component: A sidebar or bottom-sheet showing the dialogue between the user and the AI coach.

Action Bar: Buttons for "Accept Plan" (saves to DB) or "Request Revision." If the plan is accepted it overwrites the current next seven days of training (stored in the workout_entries table in supabase)

3. Implementation Steps for Claude Code
Database Setup: Create the coaching_history table in Supabase with columns for user_id, session_id, and a messages JSONB array.

Look at the existing Supabase Edge Function and revise based on your recommendation from looking at this task.
API Route: Develop a /api/coach endpoint that:

Queries the last 4 weeks of training data.

Constructs the System Prompt for Gemini.

Handles the history array for multi-turn conversations.

Frontend Logic: Build a React page that polls the API and updates the local state of the 7-day plan based on the AI's structured JSON response.

Suggested Prompt for Gemini (System Instruction)
"You are an elite endurance coach. Analyze the provided 4-week training history to assess fatigue and progress. Generate a 7-day plan in JSON format. If the user provides feedback or constraints, revise the plan while maintaining athletic integrity. Always return both a coaching_feedback string and a structured_plan array."
You can change the prompt in a settings modal.

COMPLETION CRITERIA

✅ About you section that provides context for coaching feedback, stored in Supabase DB (new user information table)
✅ Ask coach-button that triggers request to gemini ai
✅ Response stored in sections (feedback for last four weeks training, recommendation for next period, feedback on life (sleep, energy etc))
✅ Possibility to ask follow-up questions in a chat layout
✅ Feedback and chat history stored to a new supabase table and presented in table component on the page

--- AGENT STATUS LOG ---

[IN PROGRESS] Branch: claude/fix-coach-page-and-weekly-plan

[DONE] Applied DB migrations:
  - runner_profiles table (created in Supabase)
  - coach_conversations table (created in Supabase)
  - coach_messages table (created in Supabase)

[IN PROGRESS] Add 7-day plan generation mode to gemini-coach edge function
  - New mode: "plan" → returns coaching_feedback (string) + structured_plan (7-day array)
  - structured_plan fields: date, workout_type, distance_km, duration_min, description

[TODO] Update CoachPage UI:
  - "Generate Weekly Plan" button → calls plan mode
  - 7-day training table display
  - "Accept Plan" button → saves to workout_entries table

[TODO] Verify in browser

Agent stops automatically when satisfied.
