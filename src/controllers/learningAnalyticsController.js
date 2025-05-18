const learningAnalyticsService = require('../services/learningAnalyticsService');
const ApiResponse = require('../utils/apiResponse');

const learningAnalyticsController = {
  /**
   * Lấy thống kê học tập
   */
  getAnalytics: async (req, res) => {
    try {
      const { type, timeRange } = req.query;
      const analytics = await learningAnalyticsService.getAnalytics(req.user._id, { type, timeRange });
      
      return ApiResponse.success(
        res,
        analytics,
        'Thống kê học tập được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },

  /**
   * Lấy đề xuất học tập
   */
  getRecommendations: async (req, res) => {
    try {
      const { type, limit, topicId } = req.query;
      const recommendations = await learningAnalyticsService.getRecommendations(
        req.user._id, 
        { type, limit, topicId }
      );
      
      return ApiResponse.success(
        res,
        recommendations,
        'Đề xuất học tập được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
};

module.exports = learningAnalyticsController; 