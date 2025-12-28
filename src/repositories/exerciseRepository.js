const { MOCK_EXERCISES } = require("../mocks/mock-exercises");

async function list() {
  return MOCK_EXERCISES;
}

module.exports = {
  list,
};
