const express = require('express');
const router = express.Router();
const userPerformanceController = require('../controllers/userPerformanceController');
const { protect } = require('../middleware');

// Tất cả các routes đều yêu cầu xác thực
router.use(protect);

// Lấy thống kê tổng quan
router.get('/overall', userPerformanceController.getOverallStats);

// Lấy thống kê theo chủ đề
router.get('/topics', userPerformanceController.getTopicPerformance);

// Lấy đề xuất cải thiện
router.get('/suggestions', userPerformanceController.getImprovementSuggestions);

// Lấy tiến độ học tập theo thời gian
router.get('/progress', userPerformanceController.getLearningProgress);

// Lấy tất cả thống kê (endpoint tổng hợp)
router.get('/all', userPerformanceController.getAllStats);

module.exports = router; 