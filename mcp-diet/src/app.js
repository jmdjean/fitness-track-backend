const express = require("express");

const dietRoutes = require("./routes/diet.routes");

function createApp() {
  const app = express();
  app.use(express.json());

  app.use("/", dietRoutes);

  return app;
}

module.exports = createApp;
