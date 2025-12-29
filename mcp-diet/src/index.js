const express = require("express");
const OpenAI = require("openai");

const app = express();
const port = process.env.PORT || 4001;

app.use(express.json());

function buildPrompt(payload) {
  const user = payload.user || {};
  const stats = payload.stats || {};
  const workouts = payload.workouts || {};

  return [
    "Gere um plano alimentar em JSON apenas.",
    "Retorne SOMENTE JSON válido, sem markdown.",
    "Use 7 dias com refeições.",
    "Use alimentos simples e quantidades claras.",
    "Escreva o conteúdo em português com acentuação correta.",
    "",
    `Usuário: ${JSON.stringify(user)}`,
    `Estatísticas: ${JSON.stringify(stats)}`,
    `Treinos recentes: ${JSON.stringify(workouts.recent || [])}`,
    "",
    "Formato JSON obrigatório:",
    "{",
    '  "goal": string,',
    '  "profile": { "age": number, "sex": string, "weightKg": number, "heightCm": number },',
    '  "targets": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },',
    '  "days": [',
    "    {",
    '      "day": string,',
    '      "meals": [',
    "        {",
    '          "name": string,',
    '          "items": [ { "name": string, "quantity": string } ],',
    '          "totalCalories": number',
    "        }",
    "      ],",
    '      "notes": string',
    "    }",
    "  ],",
    '  "notes": [string]',
    "}",
  ].join("\n");
}

app.post("/generate", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada." });
  }

  const payload = req.body || {};
  if (!payload.user || !payload.user.birthdate) {
    return res.status(400).json({ error: "Data de nascimento é obrigatório." });
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente de nutrição que retorna apenas JSON em português.",
        },
        { role: "user", content: buildPrompt(payload) },
      ],
    });

    const content = completion.choices?.[0]?.message?.content || "";
    let plan;
    try {
      plan = JSON.parse(content);
    } catch (error) {
      return res.status(500).json({
        error: "Falha ao interpretar a resposta do modelo como JSON.",
        raw: content,
      });
    }

    return res.json({ plan });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Falha ao gerar a dieta." });
  }
});

app.listen(port, () => {
  console.log(`mcp-diet rodando em http://localhost:${port}`);
});
