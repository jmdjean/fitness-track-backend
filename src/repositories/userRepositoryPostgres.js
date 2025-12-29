const { randomUUID } = require("crypto");

const db = require("../db");

async function create(data) {
  const id = randomUUID();
  const result = await db.query(
    `INSERT INTO users (id, name, email, password_hash, birthdate, weight_kg, height_cm, sexo, objetivo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, email, birthdate, weight_kg AS "weightKg", height_cm AS "heightCm",
               sexo, objetivo`,
    [
      id,
      data.name,
      data.email,
      data.passwordHash,
      data.birthdate,
      data.weightKg,
      data.heightCm,
      data.sexo,
      data.objetivo,
    ]
  );
  return result.rows[0];
}

async function getByEmail(email) {
  const result = await db.query(
    `SELECT id, name, email, password_hash AS "passwordHash",
            birthdate, weight_kg AS "weightKg", height_cm AS "heightCm",
            sexo, objetivo
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
