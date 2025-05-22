const express = require("express");
const router = express.Router();
const { protect } = require("../middleware");
const { practiceController } = require("../controllers/practiceController");

router.use(protect);

// Start a new practice session (get random questions)
router.post("/start", practiceController.startPracticeSession);

// Submit an answer (real-time or batch)
router.post("/answer", practiceController.submitAnswer);

// Complete the session and get summary
router.post("/complete", practiceController.completePracticeSession);

// // Optionally: Get session details/summary
// router.get("/:sessionId", practiceController.getPracticeSession);

module.exports = router;
