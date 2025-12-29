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
    "Generate a JSON diet plan only.",
    "Return ONLY valid JSON, no markdown.",
    "Use 7 days with meals.",
    "Use simple foods and quantities.",
    "",
    `User: ${JSON.stringify(user)}`,
    `Stats: ${JSON.stringify(stats)}`,
    `RecentWorkouts: ${JSON.stringify(workouts.recent || [])}`,
    "",
    "Required JSON shape:",
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
    return res.status(500).json({ error: "OPENAI_API_KEY not configured." });
  }

  const payload = req.body || {};
  if (!payload.user || !payload.user.birthdate) {
    return res.status(400).json({ error: "birthdate is required." });
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
          content: "You are a nutrition assistant that outputs JSON only.",
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
        error: "Failed to parse model response as JSON.",
        raw: content,
      });
    }

    return res.json({ plan });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate diet." });
  }
});

app.listen(port, () => {
  console.log(`mcp-diet running on http://localhost:${port}`);
});
