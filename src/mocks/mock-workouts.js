const { MOCK_EXERCISES } = require("./mock-exercises");

const sets = 4;
const reps = 12;
const EXERCISES_PER_WORKOUT = 8;

const buildExercises = (startId, startIndex) =>
  Array.from({ length: EXERCISES_PER_WORKOUT }, (_, index) => {
    const exercise =
      MOCK_EXERCISES[(startIndex + index) % MOCK_EXERCISES.length];
    return {
      id: String(startId + index),
      exercise,
      sets,
      reps,
    };
  });

const MOCK_WORKOUTS = [
  {
    id: "1",
    userId: "1",
    name: "Treino Full Body A",
    exercises: buildExercises(1, 0),
    totalCalories: 420,
  },
  {
    id: "2",
    userId: "1",
    name: "Treino Full Body B",
    exercises: buildExercises(9, 8),
    totalCalories: 460,
  },
  {
    id: "3",
    userId: "1",
    name: "Treino Cardio A",
    exercises: buildExercises(17, 16),
    totalCalories: 500,
  },
  {
    id: "4",
    userId: "1",
    name: "Treino Forca A",
    exercises: buildExercises(25, 24),
    totalCalories: 390,
  },
  {
    id: "5",
    userId: "1",
    name: "Treino Core A",
    exercises: buildExercises(33, 32),
    totalCalories: 350,
  },
  {
    id: "6",
    userId: "1",
    name: "Treino Misto A",
    exercises: buildExercises(41, 40),
    totalCalories: 470,
  },
];

module.exports = {
  MOCK_WORKOUTS,
};
