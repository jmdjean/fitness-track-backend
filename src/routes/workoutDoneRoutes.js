const express = require("express");

const asyncHandler = require("./asyncHandler");
const workoutDoneService = require("../services/workoutDoneService");
const workoutDoneRepositoryPostgres = require("../repositories/workoutDoneRepositoryPostgres");
const userRepositoryPostgres = require("../repositories/userRepositoryPostgres");
const db = require("../db");

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

async function resolveUserId(rawUserId) {
  if (!rawUserId) {
    return "";
  }

  const userId = String(rawUserId).trim();
  if (!allowEmailLookup || !userId.includes("@")) {
    return userId;
  }

  const user = await userRepositoryPostgres.getByEmail(userId);
  return user ? user.id : "";
}

function createWorkoutDoneRoutes() {
  const router = express.Router();

  router.get(
    "/stats/last-week/count",
    asyncHandler(async (req, res) => {
      const headerUserId = req.userId;
      if (!headerUserId) {
        return res
          .status(400)
          .json({ error: "userId e obrigatorio no header." });
      }

      const userId = await resolveUserId(headerUserId);
      if (!userId) {
        return res.status(400).json({ error: "ID do usuario nao encontrado" });
      }

      const { startDate, endDate } = getLastWeekRange();
      const result = await db.query(
        `SELECT COUNT(*)::int AS count
         FROM workout_dones wd
         WHERE wd.user_id = $1
           AND wd.done_at::date BETWEEN $2 AND $3`,
        [userId, startDate, endDate]
      );

      return res.json({
        count: result.rows[0]?.count ?? 0,
        startDate,
        endDate,
      });
    })
  );

  router.get(
    "/stats/last-week/calories",
    asyncHandler(async (req, res) => {
      const headerUserId = req.userId;
      if (!headerUserId) {
        return res
          .status(400)
          .json({ error: "userId e obrigatorio no header." });
      }

      const userId = await resolveUserId(headerUserId);
      if (!userId) {
        return res.status(400).json({ error: "ID do usuario nao encontrado" });
      }

      const { startDate, endDate } = getLastWeekRange();
      const result = await db.query(
        `SELECT COALESCE(SUM(w.total_calories), 0) AS total_calories
         FROM workout_dones wd
         JOIN workouts w ON w.id = wd.workout_id
         WHERE wd.user_id = $1
           AND wd.done_at::date BETWEEN $2 AND $3`,
        [userId, startDate, endDate]
      );

      const totalCalories = Number(result.rows[0]?.total_calories) || 0;
      return res.json({ totalCalories, startDate, endDate });
    })
  );

  router.get(
    "/stats/last-week/max-weight-exercise",
    asyncHandler(async (req, res) => {
      const headerUserId = req.userId;
      if (!headerUserId) {
        return res
          .status(400)
          .json({ error: "userId e obrigatorio no header." });
      }

      const userId = await resolveUserId(headerUserId);
      if (!userId) {
        return res.status(400).json({ error: "ID do usuario nao encontrado" });
      }

      const { startDate, endDate } = getLastWeekRange();
      const result = await db.query(
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

      const row = result.rows[0];
      if (!row) {
        return res.json({
          exerciseName: null,
          maxWeightKg: 0,
          startDate,
          endDate,
        });
      }

      return res.json({
        exerciseName: row.name,
        maxWeightKg: Number(row.max_weight) || 0,
        startDate,
        endDate,
      });
    })
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const headerUserId = req.userId;
      if (!headerUserId) {
        return res
          .status(400)
          .json({ error: "userId e obrigatorio no header." });
      }

      const userId = await resolveUserId(headerUserId);
      if (!userId) {
        return res
          .status(400)
          .json({ error: "ID do usuario nao encontrado" });
      }

      const items = await workoutDoneRepositoryPostgres.listByUser(userId);
      return res.json(items);
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const data = { ...req.body };
      const headerUserId = req.userId;
      if (!headerUserId) {
        return res
          .status(400)
          .json({ error: "userId e obrigatorio no header." });
      }
      if (data.userId && data.userId !== headerUserId) {
        return res
          .status(400)
          .json({ error: "userId do corpo nao confere com o header." });
      }

      data.userId = await resolveUserId(headerUserId);
      if (!data.userId) {
        return res
          .status(400)
          .json({ error: "ID do usuário não encontrado" });
      }

      const payload = workoutDoneService.buildCreatePayload(data);
      if (payload.error) {
        return res.status(400).json({ error: payload.error });
      }

      const workoutExists = await db.query(
        `SELECT id FROM workouts WHERE id = $1 AND user_id = $2`,
        [payload.data.workoutId, payload.data.userId]
      );
      if (!workoutExists.rows[0]) {
        return res
          .status(404)
          .json({ error: "Treino não encontrado para esse usuário" });
      }

      const done = await workoutDoneRepositoryPostgres.create(payload.data);
      return res.status(201).json(done);
    })
  );

  return router;
}

module.exports = createWorkoutDoneRoutes;
