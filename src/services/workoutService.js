function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateExercises(exercises) {
  if (!Array.isArray(exercises)) {
    return "Exercícios devem ser uma lista";
  }

  for (const item of exercises) {
    if (!isNonEmptyString(item.id)) {
      return "ID do exercício é obrigatório";
    }

    if (!isNonEmptyString(item.exercise)) {
      return "Nome do exercício é obrigatório";
    }

    if (!isFiniteNumber(item.sets)) {
      return "Séries devem ser um número";
    }

    if (!isFiniteNumber(item.reps)) {
      return "Repetições devem ser um número";
    }
  }

  return null;
}

function buildCreatePayload(input) {
  const { name, exercises, totalCalories, userId } = input;

  if (!isNonEmptyString(name)) {
    return { error: "Nome é obrigatório" };
  }

  if (!isNonEmptyString(userId)) {
    return { error: "ID do usuário é obrigatório" };
  }

  const exercisesError = validateExercises(exercises);
  if (exercisesError) {
    return { error: exercisesError };
  }

  if (!isFiniteNumber(totalCalories)) {
    return { error: "Total de calorias deve ser um número" };
  }

  return {
    data: {
      userId: userId.trim(),
      name: name.trim(),
      exercises,
      totalCalories,
    },
  };
}

function buildUpdatePayload(input) {
  const { name, exercises, totalCalories, userId } = input;
  const data = {};

  if (name !== undefined) {
    if (!isNonEmptyString(name)) {
      return { error: "Nome é obrigatório" };
    }
    data.name = name.trim();
  }

  if (exercises !== undefined) {
    const exercisesError = validateExercises(exercises);
    if (exercisesError) {
      return { error: exercisesError };
    }
    data.exercises = exercises;
  }

  if (totalCalories !== undefined) {
    if (!isFiniteNumber(totalCalories)) {
      return { error: "Total de calorias deve ser um número" };
    }
    data.totalCalories = totalCalories;
  }

  if (userId !== undefined) {
    if (!isNonEmptyString(userId)) {
      return { error: "ID do usuário é obrigatório" };
    }
    data.userId = userId.trim();
  }

  return { data };
}

module.exports = {
  buildCreatePayload,
  buildUpdatePayload,
};
