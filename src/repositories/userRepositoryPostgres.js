const { randomUUID } = require("crypto");

const db = require("../db");

async function create(data) {
  const id = randomUUID();
  const result = await db.query(
    `INSERT INTO users (id, email, password_hash, birthdate, weight_kg, height_cm)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, birthdate, weight_kg AS "weightKg", height_cm AS "heightCm"`,
    [
      id,
      data.email,
      data.passwordHash,
      data.birthdate,
      data.weightKg,
      data.heightCm,
    ]
  );
  return result.rows[0];
}

async function getByEmail(email) {
  const result = await db.query(
    `SELECT id, email, password_hash AS "passwordHash",
            birthdate, weight_kg AS "weightKg", height_cm AS "heightCm"
     FROM users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

module.exports = {
  create,
  getByEmail,
};
