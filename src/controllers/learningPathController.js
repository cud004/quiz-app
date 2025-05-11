const learningPathService = require('../services/learningPathService');
const ApiResponse = require('../utils/apiResponse');

const learningPathController = {
  /**
   * Lấy lộ trình học tập của người dùng
   */
  getLearningPath: async (req, res) => {
    try {
      const userId = req.user._id;
      
      const learningPath = await learningPathService.getLearningPath(userId);
      
      return ApiResponse.success(
        res,
        learningPath,
        'Lộ trình học tập được lấy thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Cập nhật hoặc tạo mới lộ trình học tập
   */
  updateLearningPath: async (req, res) => {
    try {
      const userId = req.user._id;
      
      const updatedPath = await learningPathService.updateLearningPath(userId);
      
      return ApiResponse.success(
        res,
        updatedPath,
        'Lộ trình học tập được cập nhật thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Cập nhật tiến độ cho một chủ đề trong lộ trình
   */
  updateTopicProgress: async (req, res) => {
    try {
      const userId = req.user._id;
      const { topicId } = req.params;
      const { progress } = req.body;
      
      // Kiểm tra tham số
      if (!topicId) {
        return ApiResponse.error(
          res,
          'Thiếu thông tin chủ đề (topicId)',
          400
        );
      }
      
      if (progress === undefined || progress === null) {
        return ApiResponse.error(
          res,
          'Thiếu thông tin tiến độ (progress)',
          400
        );
      }
      
      const updatedPath = await learningPathService.updateTopicProgress(
        userId,
        topicId,
        parseFloat(progress)
      );
      
      return ApiResponse.success(
        res,
        updatedPath,
        'Tiến độ chủ đề được cập nhật thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Cập nhật ưu tiên cho một chủ đề trong lộ trình
   */
  updateTopicPriority: async (req, res) => {
    try {
      const userId = req.user._id;
      const { topicId } = req.params;
      const { priority } = req.body;
      
      // Kiểm tra tham số
      if (!topicId) {
        return ApiResponse.error(
          res,
          'Thiếu thông tin chủ đề (topicId)',
          400
        );
      }
      
      if (priority === undefined || priority === null) {
        return ApiResponse.error(
          res,
          'Thiếu thông tin ưu tiên (priority)',
          400
        );
      }
      
      const updatedPath = await learningPathService.updateTopicPriority(
        userId,
        topicId,
        parseInt(priority)
      );
      
      return ApiResponse.success(
        res,
        updatedPath,
        'Ưu tiên chủ đề được cập nhật thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Xóa một chủ đề khỏi lộ trình học tập
   */
  removeTopicFromPath: async (req, res) => {
    try {
      const userId = req.user._id;
      const { topicId } = req.params;
      
      // Kiểm tra tham số
      if (!topicId) {
        return ApiResponse.error(
          res,
          'Thiếu thông tin chủ đề (topicId)',
          400
        );
      }
      
      const updatedPath = await learningPathService.removeTopicFromPath(
        userId,
        topicId
      );
      
      return ApiResponse.success(
        res,
        updatedPath,
        'Chủ đề đã được xóa khỏi lộ trình học tập'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Thêm một chủ đề vào lộ trình học tập
   */
  addTopicToPath: async (req, res) => {
    try {
      const userId = req.user._id;
      const { topicId, priority } = req.body;
      
      // Kiểm tra tham số
      if (!topicId) {
        return ApiResponse.error(
          res,
          'Thiếu thông tin chủ đề (topicId)',
          400
        );
      }
      
      const updatedPath = await learningPathService.addTopicToPath(
        userId,
        topicId,
        priority ? parseInt(priority) : null
      );
      
      return ApiResponse.success(
        res,
        updatedPath,
        'Chủ đề được thêm vào lộ trình học tập thành công'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
};

module.exports = learningPathController; 