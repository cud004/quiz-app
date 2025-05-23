const express = require('express');
const router = express.Router();
const learningAnalyticsController = require('../controllers/learningAnalyticsController');
const { protect } = require('../middleware');

// Tất cả các routes đều yêu cầu xác thực
router.use(protect);

// Lấy thống kê học tập
router.get('/analytics', learningAnalyticsController.getAnalytics);

module.exports = router; 