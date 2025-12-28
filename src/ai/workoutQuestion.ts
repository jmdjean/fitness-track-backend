import express from "express";

import * as db from "../db";

const QUESTIONS = {
  workouts_count: {
    requiresUser: true,
    sql: "SELECT COUNT(*)::int AS count FROM workouts WHERE user_id = $1",
  },
  exercises_count: {
    requiresUser: false,
    sql: "SELECT COUNT(*)::int AS count FROM exercises",
  },
} as const;

type QuestionKey = keyof typeof QUESTIONS;

function resolveQuestionKey(rawType?: unknown, rawQuestion?: unknown) {
  const type = String(rawType || "").trim().toLowerCase();
  if (type && type in QUESTIONS) {
    return type as QuestionKey;
  }

  const question = String(rawQuestion || "").trim().toLowerCase();
  if (!question) {
    return null;
  }

  if (question.includes("treino") || question.includes("workout")) {
    return "workouts_count";
  }

  if (question.includes("exercicio") || question.includes("exercise")) {
    return "exercises_count";
  }

  return null;
}

export function createWorkoutQuestionRouter() {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const questionKey = resolveQuestionKey(req.body?.type, req.body?.question);
    if (!questionKey) {
      return res.status(400).json({
        error:
          "Tipo de pergunta invalido. Use 'workouts_count' ou 'exercises_count'.",
      });
    }

    const config = QUESTIONS[questionKey];
    const userId = String(req.body?.userId || req.userId || "").trim();
    if (config.requiresUser && !userId) {
      return res.status(400).json({ error: "userId e obrigatorio." });
    }

    try {
      const params = config.requiresUser ? [userId] : [];
      const result = await db.query(config.sql, params);
      const count = result.rows[0]?.count ?? 0;

      return res.json({
        metric: questionKey,
        filters: config.requiresUser ? { userId } : {},
        count,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Falha ao consultar o banco de dados" });
    }
  });

  return router;
}
