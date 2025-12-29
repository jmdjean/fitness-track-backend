const bcrypt = require("bcryptjs");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizeBirthdate(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function validateBodyMetrics(bodyMetrics) {
  if (bodyMetrics === null || bodyMetrics === undefined) {
    return { data: { weightKg: null, heightCm: null } };
  }

  const { weightKg, heightCm } = bodyMetrics;

  if (weightKg !== null && weightKg !== undefined && !isFiniteNumber(weightKg)) {
    return { error: "Peso (kg) deve ser um número" };
  }

  if (heightCm !== null && heightCm !== undefined && !isFiniteNumber(heightCm)) {
    return { error: "Altura (cm) deve ser um número" };
  }

  return {
    data: {
      weightKg: weightKg ?? null,
      heightCm: heightCm ?? null,
    },
  };
}

function normalizeChoice(value) {
  if (!isNonEmptyString(value)) {
    return "";
  }
  return value.trim().toLowerCase();
}

function validateSexo(value) {
  if (!isNonEmptyString(value)) {
    return { error: "Sexo e obrigatorio" };
  }

  const normalized = normalizeChoice(value);
  if (normalized !== "homem" && normalized !== "mulher") {
    return { error: "Sexo deve ser homem ou mulher" };
  }

  return { data: normalized };
}

function validateObjetivo(value) {
  if (!isNonEmptyString(value)) {
    return { error: "Objetivo e obrigatorio" };
  }

  const normalized = normalizeChoice(value);
  if (
    normalized !== "ganho de massa" &&
    normalized !== "perder peso" &&
    normalized !== "manutencao de massa magra"
  ) {
    return {
      error:
        "Objetivo deve ser ganho de massa, perder peso ou manutencao de massa magra",
    };
  }

  return { data: normalized };
}

async function buildRegisterPayload(input) {
  const {
    name,
    email,
    password,
    confirmPassword,
    birthdate,
    bodyMetrics,
    sexo,
    objetivo,
  } = input;

  if (!isNonEmptyString(name)) {
    return { error: "Nome é obrigatório" };
  }

  if (!isNonEmptyString(email)) {
    return { error: "Email é obrigatório" };
  }

  if (!isNonEmptyString(password)) {
    return { error: "Senha é obrigatória" };
  }

  if (password !== confirmPassword) {
    return { error: "Senhas não conferem" };
  }

  const birthdateValue = normalizeBirthdate(birthdate);
  if (birthdate !== null && birthdate !== undefined && !birthdateValue) {
    return { error: "Data de nascimento inválida" };
  }

  const metrics = validateBodyMetrics(bodyMetrics);
  if (metrics.error) {
    return metrics;
  }

  const sexoResult = validateSexo(sexo);
  if (sexoResult.error) {
    return sexoResult;
  }

  const objetivoResult = validateObjetivo(objetivo);
  if (objetivoResult.error) {
    return objetivoResult;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return {
    data: {
      name: name.trim(),
      email: normalizeEmail(email),
      passwordHash,
      birthdate: birthdateValue,
      weightKg: metrics.data.weightKg,
      heightCm: metrics.data.heightCm,
      sexo: sexoResult.data,
      objetivo: objetivoResult.data,
    },
  };
}

function buildLoginPayload(input) {
  const { email, password } = input;

  if (!isNonEmptyString(email)) {
    return { error: "Email é obrigatório" };
  }

  if (!isNonEmptyString(password)) {
    return { error: "Senha é obrigatória" };
  }

  return {
    data: {
      email: normalizeEmail(email),
      password,
    },
  };
}

module.exports = {
  buildRegisterPayload,
  buildLoginPayload,
};
