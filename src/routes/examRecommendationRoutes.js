const express = require('express');
const router = express.Router();
const examRecommendationController = require('../controllers/examRecommendationController');
const { protect } = require('../middleware');

// Tất cả các routes đều yêu cầu xác thực
router.use(protect);

// Lấy đề xuất bài thi dựa trên hiệu suất người dùng
router.get('/recommended', examRecommendationController.getRecommendedExams);

// Lấy đề xuất bài thi dựa trên một chủ đề cụ thể
router.get('/topic/:topicId', examRecommendationController.getTopicBasedRecommendations);

// Lấy đề thi phổ biến
router.get('/popular', examRecommendationController.getPopularExams);

// Lấy đề xuất học tập toàn diện (dùng cho trang Gợi ý ôn tập thông minh)
router.get('/smart-learning', examRecommendationController.getComprehensiveRecommendations);

module.exports = router; 