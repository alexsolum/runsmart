-- Phase 18: Plan RPC functions + status constraint update
-- DATA-02: apply_plan_patch RPC for atomic JSONB patch operations
-- DATA-03: move_workout RPC for atomic drag-and-drop workout moves

-- 1. Add 'replaced' to the status check constraint
ALTER TABLE hierarchical_plans DROP CONSTRAINT IF EXISTS hierarchical_plans_status_check;
ALTER TABLE hierarchical_plans ADD CONSTRAINT hierarchical_plans_status_check
  CHECK (status IN ('active', 'generating', 'failed', 'replaced'));

-- 2. apply_plan_patch RPC (DATA-02)
-- Receives plan_id and a JSONB array of patches, each with {week, dayDate, workoutId, fields}.
-- Iterates over the patch array and applies jsonb_set for each patch target.
-- All patches execute in one transaction. Returns the updated plan_data JSONB.
CREATE OR REPLACE FUNCTION apply_plan_patch(
  p_plan_id uuid,
  p_patches jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_plan_data jsonb;
  v_patch jsonb;
  v_week_idx int;
  v_day_idx int;
  v_workout_idx int;
  v_weeks jsonb;
  v_days jsonb;
  v_workouts jsonb;
  v_field_key text;
  v_field_value jsonb;
BEGIN
  -- Lock row for update
  SELECT plan_data INTO v_plan_data
  FROM hierarchical_plans
  WHERE id = p_plan_id AND user_id = auth.uid()
  FOR UPDATE;

  IF v_plan_data IS NULL THEN
    RAISE EXCEPTION 'Plan not found or access denied';
  END IF;

  -- Iterate over each patch in the array
  FOR v_patch IN SELECT * FROM jsonb_array_elements(p_patches)
  LOOP
    v_weeks := v_plan_data->'weeks';
    -- Find week index matching patch.week
    FOR v_week_idx IN 0..(jsonb_array_length(v_weeks) - 1)
    LOOP
      IF (v_weeks->v_week_idx->>'weekNumber')::int = (v_patch->>'week')::int THEN
        v_days := v_weeks->v_week_idx->'days';
        -- Find day index matching patch.dayDate
        FOR v_day_idx IN 0..(jsonb_array_length(v_days) - 1)
        LOOP
          IF v_days->v_day_idx->>'date' = v_patch->>'dayDate' THEN
            v_workouts := v_days->v_day_idx->'workouts';
            -- Find workout index matching patch.workoutId
            FOR v_workout_idx IN 0..(jsonb_array_length(v_workouts) - 1)
            LOOP
              IF v_workouts->v_workout_idx->>'id' = v_patch->>'workoutId' THEN
                -- Apply each field from patch.fields
                FOR v_field_key, v_field_value IN SELECT * FROM jsonb_each(v_patch->'fields')
                LOOP
                  v_plan_data := jsonb_set(
                    v_plan_data,
                    ARRAY['weeks', v_week_idx::text, 'days', v_day_idx::text, 'workouts', v_workout_idx::text, v_field_key],
                    v_field_value
                  );
                END LOOP;
                EXIT; -- found workout
              END IF;
            END LOOP;
            EXIT; -- found day
          END IF;
        END LOOP;
        EXIT; -- found week
      END IF;
    END LOOP;
  END LOOP;

  -- Write back
  UPDATE hierarchical_plans
  SET plan_data = v_plan_data, updated_at = now()
  WHERE id = p_plan_id AND user_id = auth.uid();

  RETURN v_plan_data;
END;
$$;

-- 3. move_workout RPC (DATA-03)
-- Receives plan_id, workout_id, from_date, to_date.
-- Finds the workout in the from_date day, removes it, appends it to the to_date day.
-- Returns the updated plan_data JSONB.
CREATE OR REPLACE FUNCTION move_workout(
  p_plan_id uuid,
  p_workout_id text,
  p_from_date text,
  p_to_date text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_plan_data jsonb;
  v_weeks jsonb;
  v_workout jsonb;
  v_wi int;
  v_di int;
  v_woi int;
  v_found boolean := false;
  v_target_wi int;
  v_target_di int;
BEGIN
  IF p_from_date = p_to_date THEN
    SELECT plan_data INTO v_plan_data
    FROM hierarchical_plans
    WHERE id = p_plan_id AND user_id = auth.uid();
    RETURN v_plan_data;
  END IF;

  SELECT plan_data INTO v_plan_data
  FROM hierarchical_plans
  WHERE id = p_plan_id AND user_id = auth.uid()
  FOR UPDATE;

  IF v_plan_data IS NULL THEN
    RAISE EXCEPTION 'Plan not found or access denied';
  END IF;

  v_weeks := v_plan_data->'weeks';

  -- Find and remove workout from source day
  FOR v_wi IN 0..(jsonb_array_length(v_weeks) - 1)
  LOOP
    FOR v_di IN 0..(jsonb_array_length(v_weeks->v_wi->'days') - 1)
    LOOP
      IF v_weeks->v_wi->'days'->v_di->>'date' = p_from_date THEN
        FOR v_woi IN 0..(jsonb_array_length(v_weeks->v_wi->'days'->v_di->'workouts') - 1)
        LOOP
          IF v_weeks->v_wi->'days'->v_di->'workouts'->v_woi->>'id' = p_workout_id THEN
            v_workout := v_weeks->v_wi->'days'->v_di->'workouts'->v_woi;
            v_plan_data := v_plan_data #- ARRAY['weeks', v_wi::text, 'days', v_di::text, 'workouts', v_woi::text];
            v_found := true;
            EXIT;
          END IF;
        END LOOP;
      END IF;
      IF v_found THEN EXIT; END IF;
    END LOOP;
    IF v_found THEN EXIT; END IF;
  END LOOP;

  IF NOT v_found THEN
    RAISE EXCEPTION 'Workout % not found on date %', p_workout_id, p_from_date;
  END IF;

  -- Find target day and append workout
  v_found := false;
  v_weeks := v_plan_data->'weeks';
  FOR v_target_wi IN 0..(jsonb_array_length(v_weeks) - 1)
  LOOP
    FOR v_target_di IN 0..(jsonb_array_length(v_weeks->v_target_wi->'days') - 1)
    LOOP
      IF v_weeks->v_target_wi->'days'->v_target_di->>'date' = p_to_date THEN
        v_plan_data := jsonb_set(
          v_plan_data,
          ARRAY['weeks', v_target_wi::text, 'days', v_target_di::text, 'workouts'],
          (v_plan_data->'weeks'->v_target_wi->'days'->v_target_di->'workouts') || jsonb_build_array(v_workout)
        );
        v_found := true;
        EXIT;
      END IF;
    END LOOP;
    IF v_found THEN EXIT; END IF;
  END LOOP;

  IF NOT v_found THEN
    RAISE EXCEPTION 'Target date % not found in plan', p_to_date;
  END IF;

  UPDATE hierarchical_plans
  SET plan_data = v_plan_data, updated_at = now()
  WHERE id = p_plan_id AND user_id = auth.uid();

  RETURN v_plan_data;
END;
$$;

-- 4. toggle_workout_completed RPC
-- Receives plan_id, workout_id, week_number, day_date.
-- Toggles the `completed` boolean field on the matching workout.
-- Returns the updated plan_data JSONB.
CREATE OR REPLACE FUNCTION toggle_workout_completed(
  p_plan_id uuid,
  p_workout_id text,
  p_week_number int,
  p_day_date text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_plan_data jsonb;
  v_current_val boolean;
  v_wi int;
  v_di int;
  v_woi int;
BEGIN
  SELECT plan_data INTO v_plan_data
  FROM hierarchical_plans
  WHERE id = p_plan_id AND user_id = auth.uid()
  FOR UPDATE;

  IF v_plan_data IS NULL THEN
    RAISE EXCEPTION 'Plan not found or access denied';
  END IF;

  FOR v_wi IN 0..(jsonb_array_length(v_plan_data->'weeks') - 1)
  LOOP
    IF (v_plan_data->'weeks'->v_wi->>'weekNumber')::int = p_week_number THEN
      FOR v_di IN 0..(jsonb_array_length(v_plan_data->'weeks'->v_wi->'days') - 1)
      LOOP
        IF v_plan_data->'weeks'->v_wi->'days'->v_di->>'date' = p_day_date THEN
          FOR v_woi IN 0..(jsonb_array_length(v_plan_data->'weeks'->v_wi->'days'->v_di->'workouts') - 1)
          LOOP
            IF v_plan_data->'weeks'->v_wi->'days'->v_di->'workouts'->v_woi->>'id' = p_workout_id THEN
              v_current_val := COALESCE((v_plan_data->'weeks'->v_wi->'days'->v_di->'workouts'->v_woi->>'completed')::boolean, false);
              v_plan_data := jsonb_set(
                v_plan_data,
                ARRAY['weeks', v_wi::text, 'days', v_di::text, 'workouts', v_woi::text, 'completed'],
                to_jsonb(NOT v_current_val)
              );

              UPDATE hierarchical_plans
              SET plan_data = v_plan_data, updated_at = now()
              WHERE id = p_plan_id AND user_id = auth.uid();

              RETURN v_plan_data;
            END IF;
          END LOOP;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'Workout % not found in week % on date %', p_workout_id, p_week_number, p_day_date;
END;
$$;
