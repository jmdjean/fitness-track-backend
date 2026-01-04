const createApp = require("./app");

const port = process.env.PORT || 4001;

const app = createApp();
app.listen(port, () => {
  console.log(`mcp-diet running on http://localhost:${port}`);
});
