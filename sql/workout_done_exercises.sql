CREATE TABLE IF NOT EXISTS workout_done_exercises (
  workout_done_id TEXT NOT NULL REFERENCES workout_dones(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sets NUMERIC NOT NULL,
  reps NUMERIC NOT NULL,
  weight_kg NUMERIC NOT NULL,
  PRIMARY KEY (workout_done_id, exercise_id)
);
