const express = require("express");

const { generateDiet } = require("../controllers/diet.controller");

const router = express.Router();

router.post("/generate", generateDiet);

module.exports = router;
