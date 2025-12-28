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
- Montar uma resposta legível e amigável para o usuário com os dados de retorno da query feita.
- Se a pergunta for, por exemplo, "Quantos usuários existem?", retorne: Existem X usuários cadastrados.
- Se a pergunta for, por exemplo, "Quantos treinos tem esse usuário?", retorne: Existem X treinos cadastrados para esse usuário e o nome dos treinos.
- Se a pergunta for, por exemplo, "Quais exercícios esse usuário faz?" deve verificar todos os treinos do usuário e buscar todos os exercícios vinculados, retorne: São os seguintes exercícios: X, Y, Z.
- Se a pergunta for ambígua, use um SELECT simples.
- Sempre que fizer sentido, adicione LIMIT 100.

Schema:
${schema}
`.trim();

function normalizeQuestion(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

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

function formatCount(label: string, count: number) {
  const total = Number.isFinite(count) ? count : 0;
  return `Tem ${total} ${label}${total === 1 ? "" : "s"} cadastrados no sistema.`;
}

function formatCountWithList(
  label: string,
  items: string[],
  count?: number | null
) {
  const total =
    typeof count === "number" && Number.isFinite(count) ? count : items.length;
  const base = `Tem ${total} ${label}${total === 1 ? "" : "s"} cadastrados no sistema`;
  if (!items.length) {
    return `${base}.`;
  }
  const list = items.map((item, index) => `${index + 1}. ${item}`).join(" ");
  return `${base}, ${list}.`;
}

function buildFriendlyText(question: string, rows: Array<Record<string, any>>) {
  const normalized = normalizeQuestion(question.trim());
  const count = rows[0]?.count;
  const countValue =
    typeof count === "number"
      ? count
      : typeof count === "string"
      ? Number.parseInt(count, 10)
      : null;

  if (normalized.includes("usuario")) {
    const emails = rows
      .map((row) => row.email)
      .filter((email) => typeof email === "string" && email.trim().length > 0)
      .map((email) => email.trim());
    if (emails.length) {
      return formatCountWithList("usuário", emails, countValue);
    }
    if (countValue !== null) {
      return formatCount("usuário", countValue);
    }
    return formatCount("usuário", rows.length);
  }

  if (normalized.includes("exercicio")) {
    if (countValue !== null) {
      return formatCount("exercício", countValue);
    }
    return formatCount("exercício", rows.length);
  }

  if (normalized.includes("treino") || normalized.includes("workout")) {
    if (countValue !== null) {
      return formatCount("treino", countValue);
    }
    return formatCount("treino", rows.length);
  }

  if (!rows.length) {
    return "Nenhum resultado encontrado.";
  }

  const details = JSON.stringify(rows);
  return `Consulta concluída. ${rows.length} registro${
    rows.length === 1 ? "" : "s"
  } encontrado${rows.length === 1 ? "" : "s"}. Dados: ${details}`;
}

function getQuestion(req: express.Request) {
  return String(req.body?.question || "").trim();
}

function buildErrorResponse(result: { error: string; status?: number }) {
  const status =
    "status" in result && Number.isFinite(result.status) ? result.status : 400;
  return { status, body: { error: result.error } };
}

function isErrorResult(
  result: { sql: string } | { error: string; status?: number }
): result is { error: string; status?: number } {
  return "error" in result;
}

function hasUserEmails(rows: Array<Record<string, any>>) {
  return rows.some(
    (row) => typeof row.email === "string" && row.email.trim().length > 0
  );
}

async function ensureUserEmails(
  question: string,
  rows: Array<Record<string, any>>
) {
  if (!normalizeQuestion(question).includes("usuario")) {
    return rows;
  }

  if (hasUserEmails(rows)) {
    return rows;
  }

  const users = await db.query(
    `SELECT email FROM users ORDER BY created_at LIMIT 100`
  );
  return users.rows;
}

export function createAskDbRouter() {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const question = getQuestion(req);
    if (!question) {
      return res.status(400).json({ error: "Pergunta é obrigatória" });
    }

    try {
      const result = await generateSql(question);
      if (isErrorResult(result)) {
        const { status, body } = buildErrorResponse(result);
        return res.status(status).json(body);
      }

      const data = await db.query(result.sql);
      const rows = await ensureUserEmails(question, data.rows);
      const friendly = buildFriendlyText(question, rows);

      return res.json({ sql: result.sql, data: [friendly], raw: rows });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Falha ao consultar o banco de dados" });
    }
  });

  return router;
}
