const examRecommendationService = require('../services/examRecommendationService');
const ApiResponse = require('../utils/apiResponse');

const examRecommendationController = {
  /**
   * Lấy đề xuất bài thi dựa trên hiệu suất người dùng
   */
  getRecommendedExams: async (req, res) => {
    try {
      const userId = req.user._id;
      const { limit } = req.query;
      
      // Mặc định là 6 đề thi nếu không có tham số
      const limitParam = limit ? parseInt(limit) : 6;
      
      // Kiểm tra giá trị hợp lệ
      if (isNaN(limitParam) || limitParam <= 0 || limitParam > 20) {
        return ApiResponse.error(
          res, 
          'Số lượng đề thi phải là một số dương và không vượt quá 20',
          400
        );
      }
      
      const recommendations = await examRecommendationService.getRecommendedExams(userId, limitParam);
      
      return ApiResponse.success(
        res,
        recommendations,
        'Đề xuất bài thi được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy đề xuất bài thi dựa trên một chủ đề cụ thể
   */
  getTopicBasedRecommendations: async (req, res) => {
    try {
      const userId = req.user._id;
      const { topicId } = req.params;
      const { limit } = req.query;
      
      // Mặc định là 3 đề thi nếu không có tham số
      const limitParam = limit ? parseInt(limit) : 3;
      
      // Kiểm tra giá trị hợp lệ
      if (isNaN(limitParam) || limitParam <= 0 || limitParam > 10) {
        return ApiResponse.error(
          res, 
          'Số lượng đề thi phải là một số dương và không vượt quá 10',
          400
        );
      }
      
      // Kiểm tra topicId
      if (!topicId) {
        return ApiResponse.error(
          res,
          'Thiếu thông tin chủ đề (topicId)',
          400
        );
      }
      
      const recommendations = await examRecommendationService.getTopicBasedRecommendations(
        userId, 
        topicId, 
        limitParam
      );
      
      return ApiResponse.success(
        res,
        recommendations,
        'Đề xuất bài thi theo chủ đề được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy đề thi phổ biến
   */
  getPopularExams: async (req, res) => {
    try {
      const { limit } = req.query;
      
      // Mặc định là 6 đề thi nếu không có tham số
      const limitParam = limit ? parseInt(limit) : 6;
      
      // Kiểm tra giá trị hợp lệ
      if (isNaN(limitParam) || limitParam <= 0 || limitParam > 20) {
        return ApiResponse.error(
          res, 
          'Số lượng đề thi phải là một số dương và không vượt quá 20',
          400
        );
      }
      
      const popularExams = await examRecommendationService.getPopularExams(limitParam);
      
      return ApiResponse.success(
        res,
        popularExams,
        'Đề thi phổ biến được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy đề xuất học tập toàn diện
   */
  getComprehensiveRecommendations: async (req, res) => {
    try {
      const userId = req.user._id;
      
      const recommendations = await examRecommendationService.getComprehensiveRecommendations(userId);
      
      return ApiResponse.success(
        res,
        recommendations,
        'Đề xuất học tập toàn diện được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
};

module.exports = examRecommendationController; 