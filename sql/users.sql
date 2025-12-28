CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  birthdate DATE NULL,
  weight_kg NUMERIC NULL,
  height_cm NUMERIC NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
