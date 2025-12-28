const { randomUUID } = require("crypto");

const { MOCK_WORKOUTS } = require("../mocks/mock-workouts");

const workouts = MOCK_WORKOUTS.map((workout) => ({
  ...workout,
  exercises: workout.exercises.map((exercise) => ({ ...exercise })),
}));

async function list() {
  return workouts;
}

async function getById(id) {
  return workouts.find((item) => item.id === id) || null;
}

async function create(data) {
  const workout = {
    id: randomUUID(),
    userId: data.userId,
    name: data.name,
    exercises: data.exercises,
    totalCalories: data.totalCalories,
  };

  workouts.push(workout);
  return workout;
}

async function update(id, data) {
  const workout = await getById(id);
  if (!workout) {
    return null;
  }

  if (data.name !== undefined) {
    workout.name = data.name;
  }

  if (data.exercises !== undefined) {
    workout.exercises = data.exercises;
  }

  if (data.totalCalories !== undefined) {
    workout.totalCalories = data.totalCalories;
  }

  if (data.userId !== undefined) {
    workout.userId = data.userId;
  }

  return workout;
}

async function remove(id) {
  const index = workouts.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }

  const removed = workouts.splice(index, 1)[0];
  return removed;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
