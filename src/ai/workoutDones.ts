import express from "express";

import * as db from "../db";

function normalizeQuestion(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseDate(input?: string | null) {
  if (!input) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }

  return null;
}

function parseDateRange(question: string, body: any) {
  const startFromBody = parseDate(body?.startDate || null);
  const endFromBody = parseDate(body?.endDate || null);
  if (startFromBody && endFromBody) {
    return { startDate: startFromBody, endDate: endFromBody };
  }

  const normalized = normalizeQuestion(question);
  if (normalized.includes("ultimo mes")) {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }

  const rangeMatch =
    normalized.match(/de\s+(\d{4}-\d{2}-\d{2})\s+ate\s+(\d{4}-\d{2}-\d{2})/) ||
    normalized.match(/de\s+(\d{2}\/\d{2}\/\d{4})\s+ate\s+(\d{2}\/\d{2}\/\d{4})/);

  if (rangeMatch) {
    const startDate = parseDate(rangeMatch[1]);
    const endDate = parseDate(rangeMatch[2]);
    if (startDate && endDate) {
      return { startDate, endDate };
    }
  }

  return { startDate: null, endDate: null };
}

function parseExerciseFilter(question: string, body: any) {
  const exerciseId = isNonEmptyString(body?.exerciseId)
    ? body.exerciseId.trim()
    : null;
  const exerciseName = isNonEmptyString(body?.exerciseName)
    ? body.exerciseName.trim()
    : null;

  if (exerciseId || exerciseName) {
    return { exerciseId, exerciseName };
  }

  const normalized = normalizeQuestion(question);
  const match = normalized.match(/com\s+([a-z0-9\s]+)/);
  if (!match) {
    return { exerciseId: null, exerciseName: null };
  }

  const raw = match[1]
    .split(" no ")[0]
    .split(" na ")[0]
    .split(" de ")[0]
    .trim();

  return raw ? { exerciseId: null, exerciseName: raw } : { exerciseId: null, exerciseName: null };
}

function formatDoneRows(rows: Array<Record<string, any>>) {
  if (!rows.length) {
    return "";
  }

  return rows
    .map((row: any, index: number) => {
      const name = row.workoutName || row.name || `Treino ${index + 1}`;
      const doneAt = row.doneAt
        ? new Date(row.doneAt).toISOString().slice(0, 10)
        : "data desconhecida";
      const exercises = Array.isArray(row.exercises)
        ? row.exercises
            .map((exercise: any) => {
              const exerciseName =
                typeof exercise?.name === "string" ? exercise.name : "Exercício";
              const sets = exercise?.sets;
              const reps = exercise?.reps;
              const weight = exercise?.weightKg;
              if (
                Number.isFinite(sets) &&
                Number.isFinite(reps) &&
                Number.isFinite(weight)
              ) {
                return `${exerciseName} (${sets}x${reps}, ${weight}kg)`;
              }
              return exerciseName;
            })
            .join(", ")
        : "";

      return `${index + 1}. ${name} (${doneAt})${
        exercises ? ` - exercícios: ${exercises}` : ""
      }`;
    })
    .join(" ");
}

async function listWorkoutDones(filters: {
  userId: string;
  startDate?: string | null;
  endDate?: string | null;
  exerciseId?: string | null;
  exerciseName?: string | null;
}) {
  const params: any[] = [filters.userId];
  let whereClause = "WHERE wd.user_id = $1";
  let paramIndex = 2;

  if (filters.startDate && filters.endDate) {
    params.push(filters.startDate, filters.endDate);
    whereClause += ` AND wd.done_at::date BETWEEN $${paramIndex} AND $${
      paramIndex + 1
    }`;
    paramIndex += 2;
  }

  if (filters.exerciseId) {
    params.push(filters.exerciseId);
    whereClause += ` AND EXISTS (
      SELECT 1
      FROM workout_done_exercises wde2
      WHERE wde2.workout_done_id = wd.id
        AND wde2.exercise_id = $${paramIndex}
    )`;
    paramIndex += 1;
  }

  if (filters.exerciseName) {
    params.push(`%${filters.exerciseName}%`);
    whereClause += ` AND EXISTS (
      SELECT 1
      FROM workout_done_exercises wde2
      JOIN exercises e2 ON e2.id = wde2.exercise_id
      WHERE wde2.workout_done_id = wd.id
        AND e2.name ILIKE $${paramIndex}
    )`;
    paramIndex += 1;
  }

  const result = await db.query(
    `SELECT wd.id,
            wd.user_id AS "userId",
            wd.workout_id AS "workoutId",
            wd.done_at AS "doneAt",
            w.name AS "workoutName",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', e.id,
                  'name', e.name,
                  'sets', wde.sets,
                  'reps', wde.reps,
                  'weightKg', wde.weight_kg
                ) ORDER BY e.name
              ) FILTER (WHERE e.id IS NOT NULL),
              '[]'
            ) AS exercises
     FROM workout_dones wd
     JOIN workouts w ON w.id = wd.workout_id
     LEFT JOIN workout_done_exercises wde ON wde.workout_done_id = wd.id
     LEFT JOIN exercises e ON e.id = wde.exercise_id
     ${whereClause}
     GROUP BY wd.id, w.name
     ORDER BY wd.done_at DESC`,
    params
  );

  return result.rows;
}

export function createWorkoutDonesRouter() {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const userId = String(req.body?.userId || req.userId || "").trim();
    if (!userId) {
      return res.status(400).json({ error: "ID do usuário é obrigatório" });
    }

    const question = String(req.body?.question || "").trim();
    if (!question) {
      return res.status(400).json({ error: "Pergunta é obrigatória" });
    }

    const { startDate, endDate } = parseDateRange(question, req.body);
    const { exerciseId, exerciseName } = parseExerciseFilter(
      question,
      req.body
    );

    try {
      const rows = await listWorkoutDones({
        userId,
        startDate,
        endDate,
        exerciseId,
        exerciseName,
      });

      const details = formatDoneRows(rows);
      const text = `Você fez ${rows.length} treino${
        rows.length === 1 ? "" : "s"
      }${details ? `. ${details}` : "."}`;

      return res.json({ data: [text], raw: rows });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Falha ao consultar o banco de dados" });
    }
  });

  return router;
}
