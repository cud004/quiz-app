const analyticsService = require('../services/analyticsService');
const ApiResponse = require('../utils/apiResponse');

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
  }
};

module.exports = analyticsController; 