function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function resolveExerciseId(item) {
  if (isNonEmptyString(item.id)) {
    return item.id;
  }

  if (isNonEmptyString(item.exercise)) {
    return item.exercise;
  }

  return "";
}

function validateExercises(exercises) {
  if (!Array.isArray(exercises)) {
    return "Exercícios devem ser uma lista";
  }

  for (const item of exercises) {
    if (!isNonEmptyString(resolveExerciseId(item))) {
      return "ID do exercício é obrigatório";
    }

    if (!isFiniteNumber(item.sets)) {
      return "Séries devem ser um número";
    }

    if (!isFiniteNumber(item.reps)) {
      return "Repetições devem ser um número";
    }

    if (!isFiniteNumber(item.weightKg)) {
      return "Peso (kg) deve ser um número";
    }
  }

  return null;
}

function mapExercises(exercises) {
  return exercises.map((item) => ({
    id: resolveExerciseId(item),
    sets: item.sets,
    reps: item.reps,
    weightKg: item.weightKg,
  }));
}

function buildCreatePayload(input) {
  const { userId, workoutId, exercises } = input;

  if (!isNonEmptyString(userId)) {
    return { error: "ID do usuário é obrigatório" };
  }

  if (!isNonEmptyString(workoutId)) {
    return { error: "workoutId é obrigatório" };
  }

  const exercisesError = validateExercises(exercises);
  if (exercisesError) {
    return { error: exercisesError };
  }

  return {
    data: {
      userId: userId.trim(),
      workoutId: workoutId.trim(),
      exercises: mapExercises(exercises),
    },
  };
}

module.exports = {
  buildCreatePayload,
};
