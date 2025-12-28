const db = require("../db");

async function list() {
  const result = await db.query(
    `SELECT id, name
     FROM exercises
     ORDER BY name`
  );
  return result.rows;
}

module.exports = {
  list,
};
