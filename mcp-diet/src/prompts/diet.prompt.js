function buildPrompt(payload) {
  const user = payload.user || {};
  const stats = payload.stats || {};
  const workouts = payload.workouts || {};
  const recentWorkouts = workouts.recent || [];

  return [
    "GOAL:",
    "Create a professional, personalized, and practical weekly meal plan.",
    "",
    "GENERAL RULES:",
    "- Return JSON only, no markdown and no extra text.",
    "- Follow the schema exactly; do not add new keys.",
    "- Use 7 days. Each day must have 4-5 meals (breakfast, snack, lunch, snack, dinner or supper).",
    "- Use simple foods common in Brazil and clear quantities (e.g., 150 g, 1 slice, 1 cup).",
    "- Ensure variety: do not repeat the same lunch or dinner on consecutive days.",
    "- Adherence: avoid extreme plans; prefer practical and sustainable options.",
    "",
    "CALORIES AND MACROS:",
    "- Adjust to the goal: loss => mild deficit; gain => mild surplus; maintenance => neutral.",
    "- Protein: 1.6-2.2 g/kg/day.",
    "- Fat: 0.6-1.0 g/kg/day.",
    "- Carbs: fill the remaining calories.",
    "",
    "MISSING DATA:",
    "- If key data is missing, assume reasonable values and record the assumption in notes.",
    "",
    "LANGUAGE:",
    "- Output must be in pt-BR with proper accents.",
    "",
    `User: ${JSON.stringify(user)}`,
    `Stats: ${JSON.stringify(stats)}`,
    `Recent workouts: ${JSON.stringify(recentWorkouts)}`,
    "",
    "REQUIRED JSON FORMAT:",
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

module.exports = { buildPrompt };
