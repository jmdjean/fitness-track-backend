const { MOCK_EXERCISES } = require("../mocks/mock-exercises");

async function list() {
  return MOCK_EXERCISES.map((name, index) => ({
    id: String(index + 1),
    name,
  }));
}

module.exports = {
  list,
};
