const { randomUUID } = require("crypto");

const db = require("../db");

async function fetchById(client, id) {
  const result = await client.query(
    `SELECT wd.id,
            wd.user_id AS "userId",
            wd.workout_id AS "workoutId",
            wd.done_at AS "doneAt",
            w.name AS "workoutName",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', e.id,
                  'name', e.name,
                  'sets', wde.sets,
                  'reps', wde.reps,
                  'weightKg', wde.weight_kg
                ) ORDER BY e.name
              ) FILTER (WHERE e.id IS NOT NULL),
              '[]'
            ) AS exercises
     FROM workout_dones wd
     JOIN workouts w ON w.id = wd.workout_id
     LEFT JOIN workout_done_exercises wde ON wde.workout_done_id = wd.id
     LEFT JOIN exercises e ON e.id = wde.exercise_id
     WHERE wd.id = $1
     GROUP BY wd.id, w.name`,
    [id]
  );
  return result.rows[0] || null;
}

async function insertExercises(client, workoutDoneId, exercises) {
  if (!exercises.length) {
    return;
  }

  const values = [workoutDoneId];
  const placeholders = exercises.map((exercise, index) => {
    const offset = index * 4;
    values.push(exercise.id, exercise.sets, exercise.reps, exercise.weightKg);
    return `($1, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${
      offset + 5
    })`;
  });

  await client.query(
    `INSERT INTO workout_done_exercises
     (workout_done_id, exercise_id, sets, reps, weight_kg)
     VALUES ${placeholders.join(", ")}`,
    values
  );
}

async function create(data) {
  const id = randomUUID();
  const client = await db.getPool().connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO workout_dones (id, user_id, workout_id)
       VALUES ($1, $2, $3)`,
      [id, data.userId, data.workoutId]
    );

    await insertExercises(client, id, data.exercises);
    await client.query("COMMIT");

    return await fetchById(client, id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listByUser(userId) {
  const result = await db.query(
    `SELECT wd.id,
            wd.done_at AS "createdAt",
            w.id AS "workoutId",
            w.name AS "workoutName",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', e.id,
                  'name', e.name,
                  'sets', wde.sets,
                  'reps', wde.reps,
                  'weightKg', wde.weight_kg
                ) ORDER BY e.name
              ) FILTER (WHERE e.id IS NOT NULL),
              '[]'
            ) AS exercises
     FROM workout_dones wd
     JOIN workouts w ON w.id = wd.workout_id
     LEFT JOIN workout_done_exercises wde ON wde.workout_done_id = wd.id
     LEFT JOIN exercises e ON e.id = wde.exercise_id
     WHERE wd.user_id = $1
     GROUP BY wd.id, w.id, w.name
     ORDER BY wd.done_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    workout: {
      id: row.workoutId,
      name: row.workoutName,
    },
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
    createdAt: row.createdAt,
  }));
}

module.exports = {
  create,
  listByUser,
};
