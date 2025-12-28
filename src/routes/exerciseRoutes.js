const express = require("express");

const asyncHandler = require("./asyncHandler");

function createExerciseRoutes(repository) {
  const router = express.Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const exercises = await repository.list();
      res.json(exercises);
    })
  );

  return router;
}

module.exports = createExerciseRoutes;
