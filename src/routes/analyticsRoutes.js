const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Lấy phân tích điểm mạnh/yếu theo chủ đề cho một người dùng
router.get('/topic-strengths/:userId', analyticsController.getTopicStrengths);

// Lấy tiến độ học tập theo thời gian của người dùng
router.get('/learning-progress/:userId', analyticsController.getLearningProgress);

// Lấy thống kê tổng quan cho dashboard admin
router.get('/dashboard', analyticsController.getDashboardStats);

// Lấy thống kê chi tiết cho một đề thi
router.get('/exam/:examId', analyticsController.getExamStatistics);

// Lấy thống kê theo thời gian
router.get('/timeline', analyticsController.getTimelineStats);

module.exports = router;
