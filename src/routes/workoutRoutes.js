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
      const workouts = await repository.list(req.userId);
      res.json(workouts);
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = parseId(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "ID inválido" });
      }

      const workout = await repository.getById(id, req.userId);
      if (!workout) {
        return res.status(404).json({ error: "Treino não encontrado" });
      }

      return res.json(workout);
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const data = { ...req.body };
      if (req.userId && data.userId && data.userId !== req.userId) {
        return res
          .status(400)
          .json({ error: "ID do usuário não confere com a sessão" });
      }
      if (req.userId && !data.userId) {
        data.userId = req.userId;
      }

      const payload = workoutService.buildCreatePayload(data);
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
        return res.status(400).json({ error: "ID inválido" });
      }

      const existing = await repository.getById(id, req.userId);
      if (!existing) {
        return res.status(404).json({ error: "Treino não encontrado" });
      }

      const data = { ...req.body };
      if (req.userId && data.userId && data.userId !== req.userId) {
        return res
          .status(400)
          .json({ error: "ID do usuário não confere com a sessão" });
      }
      if (req.userId && !data.userId) {
        data.userId = req.userId;
      }

      const payload = workoutService.buildUpdatePayload(data);
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
        return res.status(400).json({ error: "ID inválido" });
      }

      const existing = await repository.getById(id, req.userId);
      if (!existing) {
        return res.status(404).json({ error: "Treino não encontrado" });
      }

      const removed = await repository.remove(id);
      if (!removed) {
        return res.status(404).json({ error: "Treino não encontrado" });
      }

      return res.json(removed);
    })
  );

  return router;
}

module.exports = createWorkoutRoutes;
