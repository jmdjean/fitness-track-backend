const OpenAI = require("openai");

function createOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured");
    error.code = "MISSING_API_KEY";
    throw error;
  }

  return new OpenAI({ apiKey });
}

module.exports = { createOpenAiClient };
