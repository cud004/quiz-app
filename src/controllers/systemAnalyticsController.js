const SystemAnalyticsService = require('../services/systemAnalyticsService');

// Thống kê tổng quan
exports.getOverviewStats = async (req, res) => {
  try {
    const { startDate, endDate, topicId } = req.query;
    const stats = await SystemAnalyticsService.getOverviewStats(startDate, endDate, topicId);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Thống kê chi tiết theo topic
exports.getTopicStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await SystemAnalyticsService.getTopicStats(startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Thống kê theo thời gian
exports.getTimeBasedStats = async (req, res) => {
  try {
    const { interval = 'month', startDate, endDate } = req.query;
    const stats = await SystemAnalyticsService.getTimeBasedStats(interval, startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const result = await SystemAnalyticsService.getPaymentHistory(Number(page), Number(limit), status);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}; 