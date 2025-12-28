function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateExercises(exercises) {
  if (!Array.isArray(exercises)) {
    return "Exercises must be an array";
  }

  for (const item of exercises) {
    if (!isNonEmptyString(item.id)) {
      return "Exercise id is required";
    }

    if (!isNonEmptyString(item.exercise)) {
      return "Exercise name is required";
    }

    if (!isFiniteNumber(item.sets)) {
      return "Sets must be a number";
    }

    if (!isFiniteNumber(item.reps)) {
      return "Reps must be a number";
    }
  }

  return null;
}

function buildCreatePayload(input) {
  const { name, exercises, totalCalories } = input;

  if (!isNonEmptyString(name)) {
    return { error: "Name is required" };
  }

  const exercisesError = validateExercises(exercises);
  if (exercisesError) {
    return { error: exercisesError };
  }

  if (!isFiniteNumber(totalCalories)) {
    return { error: "TotalCalories must be a number" };
  }

  return {
    data: {
      name: name.trim(),
      exercises,
      totalCalories,
    },
  };
}

function buildUpdatePayload(input) {
  const { name, exercises, totalCalories } = input;
  const data = {};

  if (name !== undefined) {
    if (!isNonEmptyString(name)) {
      return { error: "Name is required" };
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
      return { error: "TotalCalories must be a number" };
    }
    data.totalCalories = totalCalories;
  }

  return { data };
}

module.exports = {
  buildCreatePayload,
  buildUpdatePayload,
};
