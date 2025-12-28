const { randomUUID } = require("crypto");

const db = require("../db");

function buildExercisesParams(exercises) {
  const values = [];
  const placeholders = exercises.map((exercise, index) => {
    const offset = index * 3;
    values.push(exercise.id, exercise.sets, exercise.reps);
    return `($1, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
  });

  return { values, placeholders };
}

async function list(userId) {
  const params = [];
  let whereClause = "";
  if (userId) {
    params.push(userId);
    whereClause = "WHERE w.user_id = $1";
  }

  const result = await db.query(
    `SELECT w.id,
            w.user_id AS "userId",
            w.name,
            w.total_calories AS "totalCalories",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', e.id,
                  'exercise', e.name,
                  'sets', we.sets,
                  'reps', we.reps
                ) ORDER BY e.name
              ) FILTER (WHERE e.id IS NOT NULL),
              '[]'
            ) AS exercises
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN exercises e ON e.id = we.exercise_id
     ${whereClause}
     GROUP BY w.id
     ORDER BY w.name`,
    params
  );
  return result.rows;
}

async function getById(id, userId) {
  const params = [id];
  let whereClause = "WHERE w.id = $1";
  if (userId) {
    params.push(userId);
    whereClause += " AND w.user_id = $2";
  }

  const result = await db.query(
    `SELECT w.id,
            w.user_id AS "userId",
            w.name,
            w.total_calories AS "totalCalories",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', e.id,
                  'exercise', e.name,
                  'sets', we.sets,
                  'reps', we.reps
                ) ORDER BY e.name
              ) FILTER (WHERE e.id IS NOT NULL),
              '[]'
            ) AS exercises
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN exercises e ON e.id = we.exercise_id
     ${whereClause}
     GROUP BY w.id`,
    params
  );
  return result.rows[0] || null;
}

async function fetchById(client, id) {
  const result = await client.query(
    `SELECT w.id,
            w.user_id AS "userId",
            w.name,
            w.total_calories AS "totalCalories",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', e.id,
                  'exercise', e.name,
                  'sets', we.sets,
                  'reps', we.reps
                ) ORDER BY e.name
              ) FILTER (WHERE e.id IS NOT NULL),
              '[]'
            ) AS exercises
     FROM workouts w
     LEFT JOIN workout_exercises we ON we.workout_id = w.id
     LEFT JOIN exercises e ON e.id = we.exercise_id
     WHERE w.id = $1
     GROUP BY w.id`,
    [id]
  );
  return result.rows[0] || null;
}

async function insertExercises(client, workoutId, exercises) {
  if (!exercises || exercises.length === 0) {
    return;
  }

  const { values, placeholders } = buildExercisesParams(exercises);
  await client.query(
    `INSERT INTO workout_exercises (workout_id, exercise_id, sets, reps)
     VALUES ${placeholders.join(", ")}`,
    [workoutId, ...values]
  );
}

async function create(data) {
  const id = randomUUID();
  const client = await db.getPool().connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO workouts (id, user_id, name, total_calories)
       VALUES ($1, $2, $3, $4)`,
      [id, data.userId, data.name, data.totalCalories]
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

async function update(id, data) {
  const client = await db.getPool().connect();

  try {
    await client.query("BEGIN");
    const existing = await fetchById(client, id);
    if (!existing) {
      await client.query("ROLLBACK");
      return null;
    }

    const next = {
      name: data.name ?? existing.name,
      totalCalories: data.totalCalories ?? existing.totalCalories,
      userId: data.userId ?? existing.userId,
    };

    await client.query(
      `UPDATE workouts
       SET user_id = $2, name = $3, total_calories = $4
       WHERE id = $1`,
      [id, next.userId, next.name, next.totalCalories]
    );

    if (data.exercises !== undefined) {
      await client.query(
        `DELETE FROM workout_exercises WHERE workout_id = $1`,
        [id]
      );
      await insertExercises(client, id, data.exercises);
    }

    await client.query("COMMIT");
    return await fetchById(client, id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function remove(id) {
  const client = await db.getPool().connect();

  try {
    await client.query("BEGIN");
    const existing = await fetchById(client, id);
    if (!existing) {
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(`DELETE FROM workouts WHERE id = $1`, [id]);
    await client.query("COMMIT");
    return existing;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
