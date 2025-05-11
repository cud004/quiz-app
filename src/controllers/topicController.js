// src/controllers/topicController.js
const topicService = require('../services/topic/topicService');
const ApiResponse = require('../utils/apiResponse');

const topicController = {
  // Lấy danh sách topics
  getTopics: async (req, res) => {
    try {
      const result = await topicService.getTopics(req.query);
      
      return ApiResponse.paginated(
        res, 
        result.topics,
        result.pagination,
        'Topics retrieved successfully'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },

  // Lấy chi tiết một topic theo ID
  getTopic: async (req, res) => {
    try {
      const topic = await topicService.getTopicById(req.params.id);
      
      return ApiResponse.success(
        res,
        topic,
        'Topic retrieved successfully'
      );
    } catch (error) {
      if (error.message === 'Topic not found') {
        return ApiResponse.notFound(res, error.message);
      }
      return ApiResponse.error(res, error.message);
    }
  },

  // Tạo topic mới
  createTopic: async (req, res) => {
    try {
      // Thêm createdBy từ user đã xác thực
      const topicData = {
        ...req.body,
        createdBy: req.user._id
      };
      
      const topic = await topicService.createTopic(topicData);

      return ApiResponse.success(
        res,
        topic,
        'Topic created successfully',
        201
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },

  // Cập nhật topic
  updateTopic: async (req, res) => {
    try {
      const topic = await topicService.updateTopic(req.params.id, req.body);

      return ApiResponse.success(
        res,
        topic,
        'Topic updated successfully'
      );
    } catch (error) {
      if (error.message === 'Topic not found') {
        return ApiResponse.notFound(res, error.message);
      }
      return ApiResponse.error(res, error.message);
    }
  },

  // Xóa topic
  deleteTopic: async (req, res) => {
    try {
      await topicService.deleteTopic(req.params.id);

      return ApiResponse.success(
        res,
        null,
        'Topic deleted successfully'
      );
    } catch (error) {
      if (error.message === 'Topic not found') {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message === 'Cannot delete topic with children') {
        return ApiResponse.error(res, error.message, 400);
      }
      return ApiResponse.error(res, error.message);
    }
  },

  // Import nhiều topics
  importTopics: async (req, res) => {
    try {
      // Thêm createdBy vào mỗi topic được import
      const topicsWithCreatedBy = req.body.topics.map(topic => ({
        ...topic,
        createdBy: req.user._id
      }));
      
      const topics = await topicService.importTopics(topicsWithCreatedBy);

      return ApiResponse.success(
        res,
        topics,
        'Topics imported successfully',
        201
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
};

module.exports = topicController;