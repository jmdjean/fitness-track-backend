CREATE TABLE IF NOT EXISTS workout_exercises (
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  PRIMARY KEY (workout_id, exercise_id)
);
