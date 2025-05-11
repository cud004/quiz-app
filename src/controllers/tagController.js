// src/controllers/tagController.js
const tagService = require('../services/tag/tagService');
const ApiResponse = require('../utils/apiResponse');

const tagController = {
  // Lấy danh sách tags
  getTags: async (req, res) => {
    try {
      const result = await tagService.getTags(req.query);
      
      return ApiResponse.paginated(
        res, 
        result.tags,
        result.pagination,
        'Tags retrieved successfully'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },

  // Lấy chi tiết một tag theo ID
  getTag: async (req, res) => {
    try {
      const result = await tagService.getTagById(req.params.id);
      
      return ApiResponse.success(
        res,
        {
          tag: result.tag,
          similarTags: result.similarTags,
          popularTags: result.popularTags,
          metadata: {
            similarTagsCount: result.similarTags.length,
            relatedTagsCount: result.tag.relatedTags ? result.tag.relatedTags.length : 0
          }
        },
        'Tag retrieved successfully'
      );
    } catch (error) {
      if (error.message === 'Tag not found') {
        return ApiResponse.notFound(res, error.message);
      }
      return ApiResponse.error(res, error.message);
    }
  },

  // Tạo tag mới
  createTag: async (req, res) => {
    try {
      const tag = await tagService.createTag(req.body);

      return ApiResponse.success(
        res,
        tag,
        'Tag created successfully',
        201
      );
    } catch (error) {
      if (error.message.includes('already exists')) {
        return ApiResponse.validationError(res, [{ field: 'name', message: error.message }]);
      }
      return ApiResponse.error(res, error.message);
    }
  },

  // Cập nhật tag
  updateTag: async (req, res) => {
    try {
      const tag = await tagService.updateTag(req.params.id, req.body);

      return ApiResponse.success(
        res,
        tag,
        'Tag updated successfully'
      );
    } catch (error) {
      if (error.message === 'Tag not found') {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('already exists')) {
        return ApiResponse.validationError(res, [{ field: 'name', message: error.message }]);
      }
      return ApiResponse.error(res, error.message);
    }
  },

  // Xóa tag
  deleteTag: async (req, res) => {
    try {
      await tagService.deleteTag(req.params.id);

      return ApiResponse.success(
        res,
        null,
        'Tag deleted successfully'
      );
    } catch (error) {
      if (error.message === 'Tag not found') {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('being used')) {
        return ApiResponse.error(res, error.message, 400);
      }
      return ApiResponse.error(res, error.message);
    }
  },

  // Import nhiều tags
  importTags: async (req, res) => {
    try {
      const tags = await tagService.importTags(req.body.tags);

      return ApiResponse.success(
        res,
        tags,
        'Tags imported successfully',
        201
      );
    } catch (error) {
      if (error.message.includes('already exist')) {
        return ApiResponse.validationError(res, [{ field: 'tags', message: error.message }]);
      }
      return ApiResponse.error(res, error.message);
    }
  }
};

module.exports = tagController; 