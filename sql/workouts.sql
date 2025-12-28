CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  exercises JSONB NOT NULL,
  total_calories NUMERIC NOT NULL
);
