const analyticsService = require('../services/analyticsService');
const ApiResponse = require('../utils/apiResponse');
const QuizAttempt = require("../models/QuizAttempt");
const analyticsController = {
  /**
   * Lấy dữ liệu analytics gần nhất theo kỳ hạn
   */
  getLatestAnalytics: async (req, res) => {
    try {
      const { period } = req.query;
      
      // Mặc định là daily nếu không cung cấp
      const validPeriod = period || 'daily';
      
      // Kiểm tra giá trị hợp lệ
      if (!['daily', 'weekly', 'monthly'].includes(validPeriod)) {
        return ApiResponse.error(
          res,
          'Kỳ hạn không hợp lệ. Các giá trị hợp lệ: daily, weekly, monthly',
          400
        );
      }
      
      const analytics = await analyticsService.getLatestAnalytics(validPeriod);
      
      return ApiResponse.success(
        res,
        analytics,
        `Dữ liệu analytics ${validPeriod} được lấy thành công`
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy lịch sử analytics theo kỳ hạn
   */
  getAnalyticsHistory: async (req, res) => {
    try {
      const { period, limit } = req.query;
      
      // Mặc định là daily nếu không cung cấp
      const validPeriod = period || 'daily';
      
      // Kiểm tra giá trị hợp lệ
      if (!['daily', 'weekly', 'monthly'].includes(validPeriod)) {
        return ApiResponse.error(
          res,
          'Kỳ hạn không hợp lệ. Các giá trị hợp lệ: daily, weekly, monthly',
          400
        );
      }
      
      // Mặc định là 10 bản ghi nếu không cung cấp
      const limitParam = limit ? parseInt(limit) : 10;
      
      // Kiểm tra giá trị hợp lệ
      if (isNaN(limitParam) || limitParam <= 0 || limitParam > 100) {
        return ApiResponse.error(
          res,
          'Số lượng bản ghi phải là một số dương và không vượt quá 100',
          400
        );
      }
      
      const analyticsHistory = await analyticsService.getAnalyticsHistory(validPeriod, limitParam);
      
      return ApiResponse.success(
        res,
        analyticsHistory,
        `Lịch sử analytics ${validPeriod} được lấy thành công`
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Tạo dữ liệu analytics mới theo kỳ hạn
   */
  generateAnalytics: async (req, res) => {
    try {
      const { period } = req.query;
      
      // Mặc định là daily nếu không cung cấp
      const validPeriod = period || 'daily';
      
      // Kiểm tra giá trị hợp lệ
      if (!['daily', 'weekly', 'monthly'].includes(validPeriod)) {
        return ApiResponse.error(
          res,
          'Kỳ hạn không hợp lệ. Các giá trị hợp lệ: daily, weekly, monthly',
          400
        );
      }
      
      const analytics = await analyticsService.generateAnalytics(validPeriod);
      
      return ApiResponse.success(
        res,
        analytics,
        `Dữ liệu analytics ${validPeriod} được tạo thành công`
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy báo cáo tổng quan hệ thống
   */
  getSystemOverview: async (req, res) => {
    try {
      const overview = await analyticsService.getSystemOverview();
      
      return ApiResponse.success(
        res,
        overview,
        'Báo cáo tổng quan hệ thống được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Cập nhật dữ liệu analytics định kỳ
   */
  scheduleAnalyticsUpdate: async (req, res) => {
    try {
      const result = await analyticsService.scheduleAnalyticsUpdate();
      
      return ApiResponse.success(
        res,
        result,
        'Cập nhật dữ liệu analytics định kỳ thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  /* Thống kê số liệu cho một bài kiểm tra (exam) */
  getExamStats: async (req, res) => {
    try {
      console.log("haha");
      const { examId } = req.params;
      // Lấy tất cả các lần làm bài của exam này
      const attempts = await QuizAttempt.find({ exam: examId });

      const totalAttempts = attempts.length;
      const completedAttempts = attempts.filter(
        (a) => a.status === "completed"
      );
      const completedCount = completedAttempts.length;
      console.log("ha", completedCount);
      // Tính điểm trung bình (chỉ tính các lần đã hoàn thành)
      let averageScore = 0;
      if (completedCount > 0) {
        const totalScore = completedAttempts.reduce(
          (sum, a) => sum + (a.score || 0),
          0
        );
        averageScore = totalScore / completedCount;
      }

      // Tỷ lệ hoàn thành
      const completionRate =
        totalAttempts > 0 ? (completedCount / totalAttempts) * 100 : 0;

      return res.json({
        success: true,
        data: {
          examId,
          totalAttempts,
          averageScore: Math.round(averageScore * 100) / 100,
          completionRate: Math.round(completionRate * 100) / 100, // %
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = analyticsController; 