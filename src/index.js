const express = require("express");
const cors = require("cors");
require("ts-node/register/transpile-only");

const workoutRepository = require("./repositories/workoutRepository");
const workoutRepositoryPostgres = require("./repositories/workoutRepositoryPostgres");
const exerciseRepository = require("./repositories/exerciseRepository");
const exerciseRepositoryPostgres = require("./repositories/exerciseRepositoryPostgres");
const authRoutes = require("./routes/authRoutes");
const createWorkoutRoutes = require("./routes/workoutRoutes");
const createExerciseRoutes = require("./routes/exerciseRoutes");
const askDbRoutes = require("./routes/askDbRoutes");

const app = express();
const port = process.env.PORT || 3000;
const useMocks = process.env.USE_MOCKS === "true";
const usePostgres = process.env.USE_POSTGRES === "true";

const selectedWorkoutRepository = useMocks
  ? workoutRepository
  : usePostgres
  ? workoutRepositoryPostgres
  : workoutRepository;

const selectedExerciseRepository = useMocks
  ? exerciseRepository
  : usePostgres
  ? exerciseRepositoryPostgres
  : exerciseRepository;

app.use(express.json());

app.use(cors());

app.use((req, res, next) => {
  const userHeader = req.get("X-User");
  if (userHeader) {
    req.userId = userHeader;
  }
  next();
});

app.get("/", (req, res) => {
  res.json({ status: "ativo" });
});

app.use("/auth", authRoutes);
app.use("/workouts", createWorkoutRoutes(selectedWorkoutRepository));
app.use("/exercises", createExerciseRoutes(selectedExerciseRepository));
app.use("/question", askDbRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
