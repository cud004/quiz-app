const userPerformanceService = require('../services/userPerformanceService');
const ApiResponse = require('../utils/apiResponse');

const userPerformanceController = {
  /**
   * Lấy thống kê hiệu suất tổng quan của người dùng
   */
  getOverallStats: async (req, res) => {
    try {
      const userId = req.user._id;
      const stats = await userPerformanceService.getOverallStats(userId);
      
      return ApiResponse.success(
        res,
        stats,
        'Thống kê hiệu suất được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy thống kê theo từng chủ đề
   */
  getTopicPerformance: async (req, res) => {
    try {
      const userId = req.user._id;
      const topicStats = await userPerformanceService.getTopicPerformance(userId);
      
      return ApiResponse.success(
        res,
        topicStats,
        'Thống kê theo chủ đề được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy đề xuất chủ đề cần cải thiện
   */
  getImprovementSuggestions: async (req, res) => {
    try {
      const userId = req.user._id;
      const suggestions = await userPerformanceService.getImprovementSuggestions(userId);
      
      return ApiResponse.success(
        res,
        suggestions,
        'Đề xuất cải thiện được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy tiến độ học tập theo thời gian
   */
  getLearningProgress: async (req, res) => {
    try {
      const userId = req.user._id;
      const { days } = req.query;
      
      // Mặc định là 30 ngày nếu không có tham số
      const daysParam = days ? parseInt(days) : 30;
      
      // Kiểm tra giá trị hợp lệ
      if (isNaN(daysParam) || daysParam <= 0 || daysParam > 365) {
        return ApiResponse.error(
          res, 
          'Số ngày phải là một số dương và không vượt quá 365',
          400
        );
      }
      
      const progress = await userPerformanceService.getLearningProgress(userId, daysParam);
      
      return ApiResponse.success(
        res,
        progress,
        'Tiến độ học tập được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy tất cả thống kê của người dùng (tổng hợp)
   */
  getAllStats: async (req, res) => {
    try {
      const userId = req.user._id;
      
      // Lấy tất cả các thống kê song song để tối ưu hiệu suất
      const [
        overallStats,
        topicPerformance,
        improvementSuggestions,
        learningProgress
      ] = await Promise.all([
        userPerformanceService.getOverallStats(userId),
        userPerformanceService.getTopicPerformance(userId),
        userPerformanceService.getImprovementSuggestions(userId),
        userPerformanceService.getLearningProgress(userId, 30) // Mặc định 30 ngày
      ]);
      
      return ApiResponse.success(
        res,
        {
          overallStats,
          topicPerformance,
          improvementSuggestions,
          learningProgress
        },
        'Tất cả thống kê được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
};

module.exports = userPerformanceController; 