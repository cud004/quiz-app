const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getOverviewStats,
  getTopicStats,
  getTimeBasedStats,
  getPaymentHistory
} = require('../controllers/systemAnalyticsController');

// Tất cả các routes đều yêu cầu xác thực và quyền admin
router.use(protect);
router.use(authorize('admin'));

// Route lấy thống kê tổng quan
router.get('/system-overview', getOverviewStats);

// Route lấy thống kê chi tiết theo topic
router.get('/system-topics', getTopicStats);

// Route lấy thống kê theo thời gian
router.get('/system-time-based', getTimeBasedStats);

// Route lấy lịch sử thanh toán toàn hệ thống (có phân trang, lọc trạng thái)
router.get('/payment-history', getPaymentHistory);

module.exports = router; 