const express = require("express");

const asyncHandler = require("./asyncHandler");
const db = require("../db");

const DIET_MCP_URL = process.env.DIET_MCP_URL || "https://fitness-track-backend-mcp.onrender.com";
const allowEmailLookup = process.env.USE_POSTGRES === "true";

function getLastWeekRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function getAge(birthdate) {
  if (!birthdate) {
    return null;
  }
  const date = new Date(birthdate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
}

async function resolveUserId(rawUserId) {
  if (!rawUserId) {
    return "";
  }

  const userId = String(rawUserId).trim();
  if (!allowEmailLookup || !userId.includes("@")) {
    return userId;
  }

  const result = await db.query(
    "SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [userId]
  );
  return result.rows[0]?.id || "";
}

async function getUserById(userId) {
  const result = await db.query(
    `SELECT id, name, email, birthdate, weight_kg AS "weightKg",
            height_cm AS "heightCm", sexo, objetivo
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getLastWeekStats(userId) {
  const { startDate, endDate } = getLastWeekRange();

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS count
     FROM workout_dones wd
     WHERE wd.user_id = $1
       AND wd.done_at::date BETWEEN $2 AND $3`,
    [userId, startDate, endDate]
  );

  const caloriesResult = await db.query(
    `SELECT COALESCE(SUM(w.total_calories), 0) AS total_calories
     FROM workout_dones wd
     JOIN workouts w ON w.id = wd.workout_id
     WHERE wd.user_id = $1
       AND wd.done_at::date BETWEEN $2 AND $3`,
    [userId, startDate, endDate]
  );

  const maxWeightResult = await db.query(
    `SELECT e.name,
            MAX(wde.weight_kg) AS max_weight
     FROM workout_dones wd
     JOIN workout_done_exercises wde ON wde.workout_done_id = wd.id
     JOIN exercises e ON e.id = wde.exercise_id
     WHERE wd.user_id = $1
       AND wd.done_at::date BETWEEN $2 AND $3
     GROUP BY e.name
     ORDER BY max_weight DESC
     LIMIT 1`,
    [userId, startDate, endDate]
  );

  return {
    startDate,
    endDate,
    workoutsCount: countResult.rows[0]?.count ?? 0,
    totalCalories: Number(caloriesResult.rows[0]?.total_calories) || 0,
    maxWeightExerciseName: maxWeightResult.rows[0]?.name || null,
    maxWeightKg: Number(maxWeightResult.rows[0]?.max_weight) || 0,
  };
}

async function getRecentWorkouts(userId) {
  const result = await db.query(
    `SELECT w.name,
            wd.done_at AS "doneAt"
     FROM workout_dones wd
     JOIN workouts w ON w.id = wd.workout_id
     WHERE wd.user_id = $1
     ORDER BY wd.done_at DESC
     LIMIT 10`,
    [userId]
  );

  return result.rows.map((row) => ({
    name: row.name,
    doneAt: row.doneAt ? new Date(row.doneAt).toISOString() : null,
  }));
}

function createDietRoutes() {
  const router = express.Router();

  router.post(
    "/generate",
    asyncHandler(async (req, res) => {
      const headerUserId = req.userId;
      if (!headerUserId) {
        return res
          .status(400)
          .json({ error: "userId é obrigatório no header." });
      }

      const userId = await resolveUserId(headerUserId);
      if (!userId) {
        return res.status(400).json({ error: "ID do usuário não encontrado" });
      }

      const user = await getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      if (!user.birthdate) {
        return res.status(400).json({
          error: "Data de nascimento obrigatória para gerar a dieta.",
        });
      }

      const age = getAge(user.birthdate);
      if (!age) {
        return res.status(400).json({
          error: "Data de nascimento inválida para gerar a dieta.",
        });
      }

      const lastWeekStats = await getLastWeekStats(userId);
      const recentWorkouts = await getRecentWorkouts(userId);

      const mcpResponse = await fetch(`${DIET_MCP_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: {
            id: user.id,
            name: user.name,
            birthdate: user.birthdate,
            age,
            weightKg: user.weightKg,
            heightCm: user.heightCm,
            sexo: user.sexo,
            objetivo: user.objetivo,
          },
          stats: lastWeekStats,
          workouts: { recent: recentWorkouts },
        }),
      });

      if (!mcpResponse.ok) {
        const body = await mcpResponse.text();
        return res.status(502).json({
          error: "Falha ao gerar dieta via MCP.",
          details: body,
        });
      }

      const payload = await mcpResponse.json();
      if (!payload || !payload.plan) {
        return res
          .status(502)
          .json({ error: "Resposta inválida do MCP." });
      }

      const result = await db.query(
        `INSERT INTO diets (user_id, plan, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET plan = EXCLUDED.plan, updated_at = NOW()
         RETURNING plan, updated_at AS "updatedAt"`,
        [userId, payload.plan]
      );

      return res.json(result.rows[0]);
    })
  );

  router.get(
    "/latest",
    asyncHandler(async (req, res) => {
      const headerUserId = req.userId;
      if (!headerUserId) {
        return res
          .status(400)
          .json({ error: "userId e obrigatorio no header." });
      }

      const userId = await resolveUserId(headerUserId);
      if (!userId) {
        return res.status(400).json({ error: "ID do usuário não encontrado" });
      }

      const result = await db.query(
        `SELECT plan, updated_at AS "updatedAt"
         FROM diets
         WHERE user_id = $1`,
        [userId]
      );

      const row = result.rows[0];
      if (!row) {
        return res.status(404).json({ error: "Dieta não encontrada." });
      }

      return res.json(row);
    })
  );

  return router;
}

module.exports = createDietRoutes;
