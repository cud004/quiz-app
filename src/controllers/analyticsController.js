const analyticsService = require('../services/analyticsService');

/**
 * Lấy phân tích điểm mạnh/yếu theo chủ đề cho một người dùng
 * @route GET /api/analytics/topic-strengths/:userId
 */
exports.getTopicStrengths = async (req, res) => {
  try {
    const { userId } = req.params;
    const topicStrengths = await analyticsService.analyzeTopicStrengths(userId);
    res.json(topicStrengths);
  } catch (error) {
    res.status(400).json({ errorCode: 'ANALYSIS_ERROR', message: error.message });
  }
};

/**
 * Lấy tiến độ học tập theo thời gian của người dùng
 * @route GET /api/analytics/learning-progress/:userId
 */
exports.getLearningProgress = async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeRange } = req.query;
    const progressData = await analyticsService.getLearningProgress(userId, timeRange);
    res.json(progressData);
  } catch (error) {
    res.status(400).json({ errorCode: 'ANALYSIS_ERROR', message: error.message });
  }
};

/**
 * Lấy thống kê tổng quan cho dashboard admin
 * @route GET /api/analytics/dashboard
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const { timeRange } = req.query;
    const dashboardStats = await analyticsService.getDashboardStats(timeRange);
    res.json(dashboardStats);
  } catch (error) {
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

/**
 * Lấy thống kê chi tiết cho một đề thi
 * @route GET /api/analytics/exam/:examId
 */
exports.getExamStatistics = async (req, res) => {
  try {
    const { examId } = req.params;
    const examStats = await analyticsService.getExamStatistics(examId);
    res.json(examStats);
  } catch (error) {
    res.status(400).json({ errorCode: 'ANALYSIS_ERROR', message: error.message });
  }
};

/**
 * Lấy thống kê theo thời gian
 * @route GET /api/analytics/timeline
 */
exports.getTimelineStats = async (req, res) => {
  try {
    const { timeRange } = req.query;
    const timelineStats = await analyticsService.getTimelineStats(timeRange);
    res.json(timelineStats);
  } catch (error) {
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};
