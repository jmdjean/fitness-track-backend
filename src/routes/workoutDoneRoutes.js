const express = require("express");

const asyncHandler = require("./asyncHandler");
const workoutDoneService = require("../services/workoutDoneService");
const workoutDoneRepositoryPostgres = require("../repositories/workoutDoneRepositoryPostgres");
const userRepositoryPostgres = require("../repositories/userRepositoryPostgres");
const db = require("../db");

const allowEmailLookup = process.env.USE_POSTGRES === "true";

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

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const data = { ...req.body };
      if (req.userId && data.userId && data.userId !== req.userId) {
        return res
          .status(400)
          .json({ error: "ID do usuário não confere com a sessão" });
      }
      if (req.userId && !data.userId) {
        data.userId = req.userId;
      }

      data.userId = await resolveUserId(data.userId);
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
