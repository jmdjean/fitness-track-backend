const db = require("../db");

async function list() {
  const result = await db.query(
    `SELECT code, category
     FROM exercises
     ORDER BY category, code`
  );
  return result.rows;
}

module.exports = {
  list,
};
