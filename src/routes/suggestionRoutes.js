const express = require("express");
const router = express.Router();
const { suggestionController } = require("../controllers/suggestionController");
const { protect } = require("../middleware");

router.use(protect);
router.get("/", suggestionController.getSuggestions);
router.get("/tags", suggestionController.getTagSuggestionsController);
router.get("/exams/weak-topics", suggestionController.suggestExamsByWeakTopics);
module.exports = router;
