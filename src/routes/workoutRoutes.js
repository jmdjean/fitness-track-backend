const express = require("express");

const workoutService = require("../services/workoutService");
const asyncHandler = require("./asyncHandler");

function createWorkoutRoutes(repository) {
  const router = express.Router();

  function parseId(param) {
    return param;
  }

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const workouts = await repository.list();
      res.json(workouts);
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const workout = await repository.getById(id);
      if (!workout) {
        return res.status(404).json({ error: "Workout not found" });
      }

      return res.json(workout);
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const payload = workoutService.buildCreatePayload(req.body);
      if (payload.error) {
        return res.status(400).json({ error: payload.error });
      }

      const workout = await repository.create(payload.data);
      return res.status(201).json(workout);
    })
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const existing = await repository.getById(id);
      if (!existing) {
        return res.status(404).json({ error: "Workout not found" });
      }

      const payload = workoutService.buildUpdatePayload(req.body);
      if (payload.error) {
        return res.status(400).json({ error: payload.error });
      }

      const workout = await repository.update(id, payload.data);
      return res.json(workout);
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const removed = await repository.remove(id);
      if (!removed) {
        return res.status(404).json({ error: "Workout not found" });
      }

      return res.json(removed);
    })
  );

  return router;
}

module.exports = createWorkoutRoutes;
