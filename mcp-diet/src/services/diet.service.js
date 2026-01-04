const { createOpenAiClient } = require("./openai.client");
const { buildPrompt } = require("../prompts/diet.prompt");

async function generateDietPlan(payload) {
  const client = createOpenAiClient();
  const prompt = buildPrompt(payload);

  const completion = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a sports nutritionist. Respond only with valid JSON, no markdown. The output must be in pt-BR.",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(content);
  } catch (error) {
    const parseError = new Error("Failed to parse model response");
    parseError.code = "INVALID_JSON";
    parseError.raw = content;
    throw parseError;
  }
}

module.exports = { generateDietPlan };
