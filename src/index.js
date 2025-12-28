const express = require("express");
const cors = require("cors");

const workoutRepository = require("./repositories/workoutRepository");
const workoutRepositoryPostgres = require("./repositories/workoutRepositoryPostgres");
const exerciseRepository = require("./repositories/exerciseRepository");
const exerciseRepositoryPostgres = require("./repositories/exerciseRepositoryPostgres");
const authRoutes = require("./routes/authRoutes");
const createWorkoutRoutes = require("./routes/workoutRoutes");
const createExerciseRoutes = require("./routes/exerciseRoutes");

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

const defaultOrigins = ["http://localhost:4200"];
const envOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/workouts", createWorkoutRoutes(selectedWorkoutRepository));
app.use("/exercises", createExerciseRoutes(selectedExerciseRepository));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
