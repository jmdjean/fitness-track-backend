import express from "express";
import OpenAI from "openai";

import * as db from "../db";

const schema = `
Tabelas:
- users(id, name, email, password_hash, birthdate, weight_kg, height_cm, created_at)
- exercises(id, name)
- workouts(id, user_id, name, total_calories, created_at)
- workout_exercises(workout_id, exercise_id, sets, reps)

Relacionamentos:
- workouts.user_id -> users.id
- workout_exercises.workout_id -> workouts.id
- workout_exercises.exercise_id -> exercises.id
`.trim();

const systemPrompt = `
Você gera apenas UMA consulta SQL para PostgreSQL baseada na pergunta do usuário.
Regras:
- Apenas SELECT.
- Não use INSERT/UPDATE/DELETE/DDL.
- Retorne SOMENTE JSON no formato: {"sql":"..."}.
- Sem explicações, sem comentários.
- Se a pergunta for ambígua, use um SELECT simples.
- Sempre que fizer sentido, adicione LIMIT 100.

Schema:
${schema}
`.trim();

function normalizeSql(sql: string) {
  const trimmed = sql.trim();
  if (!trimmed) {
    return "";
  }

  const semicolonIndex = trimmed.indexOf(";");
  if (semicolonIndex !== -1 && semicolonIndex !== trimmed.length - 1) {
    return "";
  }

  const withoutSemicolon =
    semicolonIndex === trimmed.length - 1 ? trimmed.slice(0, -1) : trimmed;

  return withoutSemicolon.trim();
}

function hasLimit(sql: string) {
  return /\blimit\s+\d+/i.test(sql);
}

function isSafeSelect(sql: string) {
  if (!/^select\b/i.test(sql)) {
    return false;
  }

  const lowered = sql.toLowerCase();
  const forbidden = [
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "create",
    "truncate",
    "grant",
    "revoke",
    "comment",
    "merge",
  ];

  return !forbidden.some((keyword) => lowered.includes(keyword));
}

function isQuotaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  const status = "status" in error ? Number(error.status) : 0;
  const code = "code" in error ? String(error.code) : "";

  return (
    status === 429 ||
    code === "insufficient_quota" ||
    message.includes("exceeded your current quota")
  );
}

async function generateSql(question: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { error: "OPENAI_API_KEY não configurada" };
  }

  const client = new OpenAI({ apiKey });
  let completion;
  try {
    completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    });
  } catch (error) {
    if (isQuotaError(error)) {
      return {
        error:
          "Cota da OpenAI esgotada. Verifique o plano/billing e tente novamente.",
        status: 429,
      };
    }

    return { error: "Falha ao consultar a OpenAI." };
  }

  const content = completion.choices?.[0]?.message?.content || "";
  let parsed: { sql?: string };

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return { error: "Resposta da IA inválida" };
  }

  const sql = normalizeSql(parsed.sql || "");
  if (!sql) {
    return { error: "SQL inválido gerado pela IA" };
  }

  if (!isSafeSelect(sql)) {
    return { error: "SQL não permitido" };
  }

  const finalSql = hasLimit(sql) ? sql : `${sql} LIMIT 100`;
  return { sql: finalSql };
}

export function createAskDbRouter() {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const question = String(req.body?.question || "").trim();
    if (!question) {
      return res.status(400).json({ error: "Pergunta é obrigatória" });
    }

    try {
      const result = await generateSql(question);
      if ("error" in result) {
        const status =
          "status" in result && Number.isFinite(result.status)
            ? result.status
            : 400;
        return res.status(status).json({ error: result.error });
      }

      const data = await db.query(result.sql);
      return res.json({ sql: result.sql, data: data.rows });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Falha ao consultar o banco de dados" });
    }
  });

  return router;
}
