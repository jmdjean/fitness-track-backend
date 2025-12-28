const express = require("express");
const bcrypt = require("bcryptjs");

const authService = require("../services/authService");
const userRepositoryPostgres = require("../repositories/userRepositoryPostgres");
const asyncHandler = require("./asyncHandler");

const router = express.Router();

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const payload = await authService.buildRegisterPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ error: payload.error });
    }

    const existing = await userRepositoryPostgres.getByEmail(payload.data.email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const user = await userRepositoryPostgres.create(payload.data);
    return res.status(201).json(user);
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const payload = authService.buildLoginPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ error: payload.error });
    }

    const user = await userRepositoryPostgres.getByEmail(payload.data.email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(
      payload.data.password,
      user.passwordHash
    );

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { passwordHash, ...safeUser } = user;
    return res.json(safeUser);
  })
);

module.exports = router;
