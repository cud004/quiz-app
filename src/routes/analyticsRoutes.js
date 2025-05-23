const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { protect, admin } = require("../middleware");

// Tất cả các routes đều yêu cầu xác thực và quyền admin
router.use(protect);
router.get("/exam/:examId/stats", analyticsController.getExamStats);
router.use(admin);

// Lấy dữ liệu analytics gần nhất
router.get("/latest", analyticsController.getLatestAnalytics);

// Lấy lịch sử analytics
router.get("/history", analyticsController.getAnalyticsHistory);

// Tạo dữ liệu analytics mới
router.post("/generate", analyticsController.generateAnalytics);

// Lấy báo cáo tổng quan hệ thống
router.get("/overview", analyticsController.getSystemOverview);

// Cập nhật dữ liệu analytics định kỳ
router.post("/schedule-update", analyticsController.scheduleAnalyticsUpdate);

module.exports = router;