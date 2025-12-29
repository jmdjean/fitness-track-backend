import express from "express";

import * as db from "../db";

const QUESTIONS = {
  workouts_count: {
    requiresUser: true,
    sql: "SELECT COUNT(*)::int AS count FROM workouts WHERE user_id = $1",
  },
  workouts_detail: {
    requiresUser: true,
    sql: `
      SELECT w.id,
             w.name,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', e.id,
                   'name', e.name,
                   'sets', we.sets,
                   'reps', we.reps
                 ) ORDER BY e.name
               ) FILTER (WHERE e.id IS NOT NULL),
               '[]'
             ) AS exercises
      FROM workouts w
      LEFT JOIN workout_exercises we ON we.workout_id = w.id
      LEFT JOIN exercises e ON e.id = we.exercise_id
      WHERE w.user_id = $1
      GROUP BY w.id
      ORDER BY w.name
    `,
  },
  exercises_count: {
    requiresUser: false,
    sql: "SELECT COUNT(*)::int AS count FROM exercises",
  },
} as const;

type QuestionKey = keyof typeof QUESTIONS;

function normalizeQuestion(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

async function resolveUserId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return { userId: "", usedEmail: false };
  }

  if (!trimmed.includes("@")) {
    return { userId: trimmed, usedEmail: false };
  }

  const result = await db.query(
    "SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [trimmed]
  );
  const userId = isNonEmptyString(result.rows[0]?.id)
    ? result.rows[0].id.trim()
    : "";

  return { userId, usedEmail: true };
}

function resolveQuestionKey(rawType?: unknown, rawQuestion?: unknown) {
  const type = String(rawType || "").trim().toLowerCase();
  if (type && type in QUESTIONS) {
    return type as QuestionKey;
  }

  const question = normalizeQuestion(String(rawQuestion || "").trim());
  if (!question) {
    return null;
  }

  if (
    question.includes("quais treinos") ||
    question.includes("lista de treinos") ||
    (question.includes("treino") && question.includes("exercicio"))
  ) {
    return "workouts_detail";
  }

  if (question.includes("treino") || question.includes("workout")) {
    return "workouts_count";
  }

  if (question.includes("exercicio") || question.includes("exercise")) {
    return "exercises_count";
  }

  return null;
}

function formatResponseText(
  questionKey: QuestionKey,
  count: number,
  rows: Array<Record<string, unknown>>
) {
  const total = Number.isFinite(count) ? count : 0;
  const details = JSON.stringify(rows);

  if (questionKey === "workouts_count") {
    return `Tem ${total} treino${total === 1 ? "" : "s"} cadastrados para esse usuário. Dados: ${details}`;
  }

  if (questionKey === "workouts_detail") {
    const workouts = rows.map((row, index) => {
      const name = typeof row.name === "string" ? row.name : `Treino ${index + 1}`;
      const exercises = Array.isArray(row.exercises)
        ? row.exercises
            .map((exercise: any) => {
              const exerciseName =
                typeof exercise?.name === "string" ? exercise.name : "Exercício";
              const sets = exercise?.sets;
              const reps = exercise?.reps;
              if (Number.isFinite(sets) && Number.isFinite(reps)) {
                return `${exerciseName} (${sets}x${reps})`;
              }
              return exerciseName;
            })
            .join(", ")
        : "";

      return `${index + 1}. ${name}${
        exercises ? ` - exercícios: ${exercises}` : ""
      }`;
    });

    const list = workouts.length ? ` ${workouts.join(" ")}` : "";
    return `Tem ${rows.length} treino${
      rows.length === 1 ? "" : "s"
    } cadastrados para esse usuário.${list}`;
  }

  if (questionKey === "exercises_count") {
    return `Tem ${total} exercício${
      total === 1 ? "" : "s"
    } cadastrados no sistema. Dados: ${details}`;
  }

  return `Dados: ${details}`;
}

export function createWorkoutQuestionRouter() {
  const router = express.Router();

  router.post("/", async (req, res) => {
    console.log("Received workout question request:", req.body);
    const questionKey = resolveQuestionKey(req.body?.type, req.body?.question);
    if (!questionKey) {
      return res.status(400).json({
        error:
          "Tipo de pergunta invalido. Use 'workouts_count' ou 'exercises_count'.",
      });
    }

    const config = QUESTIONS[questionKey];
    const rawUserId = String(req.userId || "").trim();
    let userId = rawUserId;

    console.log("Config question:", config);
    console.log("User ID:", userId);

    if (config.requiresUser) {
      const resolved = await resolveUserId(rawUserId);
      userId = resolved.userId;
      console.log("Resolved User ID:", userId);

      if (!userId) {
        return res.status(resolved.usedEmail ? 404 : 400).json({
          error: resolved.usedEmail
            ? "Usuario nao encontrado para o email informado."
            : "userId e obrigatorio.",
        });
      }
    }

    try {
      const params = config.requiresUser ? [userId] : [];
      console.log("SQL Params:", params);
      console.log("query:", config.sql);
      const result = await db.query(config.sql, params);
      const count = result.rows[0]?.count ?? 0;
      const text = formatResponseText(questionKey, count, result.rows);

      return res.json({
        metric: questionKey,
        filters: config.requiresUser ? { userId } : {},
        count,
        data: [text],
        raw: result.rows,
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
