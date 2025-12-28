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
    return "Exercヴcios devem ser uma lista";
  }

  for (const item of exercises) {
    if (!isNonEmptyString(resolveExerciseId(item))) {
      return "ID do exercヴcio ゼ obrigatИrio";
    }

    if (!isFiniteNumber(item.sets)) {
      return "Sゼries devem ser um nカmero";
    }

    if (!isFiniteNumber(item.reps)) {
      return "RepetiВリes devem ser um nカmero";
    }
  }

  return null;
}

function mapExercises(exercises) {
  return exercises.map((item) => ({
    id: resolveExerciseId(item),
    sets: item.sets,
    reps: item.reps,
  }));
}

function buildCreatePayload(input) {
  const { name, exercises, totalCalories, userId } = input;

  if (!isNonEmptyString(name)) {
    return { error: "Nome ゼ obrigatИrio" };
  }

  if (!isNonEmptyString(userId)) {
    return { error: "ID do usuケrio ゼ obrigatИrio" };
  }

  const exercisesError = validateExercises(exercises);
  if (exercisesError) {
    return { error: exercisesError };
  }

  const calories =
    totalCalories === undefined || totalCalories === null ? 0 : totalCalories;
  if (!isFiniteNumber(calories)) {
    return { error: "Total de calorias deve ser um nカmero" };
  }

  return {
    data: {
      userId: userId.trim(),
      name: name.trim(),
      exercises: mapExercises(exercises),
      totalCalories: calories,
    },
  };
}

function buildUpdatePayload(input) {
  const { name, exercises, totalCalories, userId } = input;
  const data = {};

  if (name !== undefined) {
    if (!isNonEmptyString(name)) {
      return { error: "Nome ゼ obrigatИrio" };
    }
    data.name = name.trim();
  }

  if (exercises !== undefined) {
    const exercisesError = validateExercises(exercises);
    if (exercisesError) {
      return { error: exercisesError };
    }
    data.exercises = mapExercises(exercises);
  }

  if (totalCalories !== undefined) {
    const calories = totalCalories === null ? 0 : totalCalories;
    if (!isFiniteNumber(calories)) {
      return { error: "Total de calorias deve ser um nカmero" };
    }
    data.totalCalories = calories;
  }

  if (userId !== undefined) {
    if (!isNonEmptyString(userId)) {
      return { error: "ID do usuケrio ゼ obrigatИrio" };
    }
    data.userId = userId.trim();
  }

  return { data };
}

module.exports = {
  buildCreatePayload,
  buildUpdatePayload,
};
