const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Giải thích lý do sai cho một câu hỏi
router.post('/explain', aiController.explainQuestion);

// Gợi ý lộ trình học tập thông minh cho người dùng
router.get('/learning-path/:userId', aiController.suggestLearningPath);

// Tạo đề thi thông minh dựa trên mức độ, chủ đề và tỷ lệ điểm yếu
router.post('/generate-exam', aiController.generateSmartExam);

module.exports = router;
