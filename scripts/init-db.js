const fs = require("fs");
const path = require("path");

const { Client } = require("pg");

const sqlFiles = [
  "users.sql",
  "exercises.sql",
  "workouts.sql",
  "workout_exercises.sql",
  "workout_dones.sql",
  "workout_done_exercises.sql",
];

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const ssl =
    process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined;

  const client = new Client({ connectionString, ssl });
  await client.connect();

  try {
    for (const file of sqlFiles) {
      const filePath = path.join(__dirname, "..", "sql", file);
      const sql = fs.readFileSync(filePath, "utf8");
      if (!sql.trim()) {
        continue;
      }
      await client.query(sql);
      console.log(`Applied ${file}`);
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error("Failed to initialize database:", error);
  process.exit(1);
});
