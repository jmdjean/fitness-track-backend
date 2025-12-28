let pool;

function getPool() {
  if (!pool) {
    const { Pool } = require("pg");
    const ssl =
      process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined;

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl,
    });
  }

  return pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

module.exports = {
  getPool,
  query,
};
