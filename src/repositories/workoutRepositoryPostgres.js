const { randomUUID } = require("crypto");

const db = require("../db");

async function list() {
  const result = await db.query(
    `SELECT id, name, exercises, total_calories AS "totalCalories"
     FROM workouts
     ORDER BY name`
  );
  return result.rows;
}

async function getById(id) {
  const result = await db.query(
    `SELECT id, name, exercises, total_calories AS "totalCalories"
     FROM workouts
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function create(data) {
  const id = randomUUID();
  const result = await db.query(
    `INSERT INTO workouts (id, name, exercises, total_calories)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, exercises, total_calories AS "totalCalories"`,
    [id, data.name, data.exercises, data.totalCalories]
  );
  return result.rows[0];
}

async function update(id, data) {
  const existing = await getById(id);
  if (!existing) {
    return null;
  }

  const next = {
    name: data.name ?? existing.name,
    exercises: data.exercises ?? existing.exercises,
    totalCalories: data.totalCalories ?? existing.totalCalories,
  };

  const result = await db.query(
    `UPDATE workouts
     SET name = $2, exercises = $3, total_calories = $4
     WHERE id = $1
     RETURNING id, name, exercises, total_calories AS "totalCalories"`,
    [id, next.name, next.exercises, next.totalCalories]
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await db.query(
    `DELETE FROM workouts
     WHERE id = $1
     RETURNING id, name, exercises, total_calories AS "totalCalories"`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
