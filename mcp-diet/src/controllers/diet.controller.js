const { generateDietPlan } = require("../services/diet.service");

async function generateDiet(req, res) {
  const payload = req.body || {};
  if (!payload.user || !payload.user.birthdate) {
    return res.status(400).json({ error: "Data de nascimento é obrigatória." });
  }

  try {
    const plan = await generateDietPlan(payload);
    return res.json({ plan });
  } catch (error) {
    if (error.code === "MISSING_API_KEY") {
      return res.status(500).json({ error: "OPENAI_API_KEY não está configurada." });
    }
    if (error.code === "INVALID_JSON") {
      return res.status(500).json({
        error: "Falha ao analisar a resposta do modelo como JSON.",
        raw: error.raw,
      });
    }

    console.error(error);
    return res.status(500).json({ error: "Falha ao gerar o plano alimentar." });
  }
}

module.exports = { generateDiet };
