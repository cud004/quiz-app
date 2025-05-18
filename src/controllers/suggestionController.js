const suggestionService = require('../services/suggestionService');
const ApiResponse = require('../utils/apiResponse');

const suggestionController = {
  getSuggestions: async (req, res) => {
    try {
      const { topicId, status, search } = req.query;
      const data = await suggestionService.getSuggestions(req.user._id, { topicId, status, search });
      return ApiResponse.success(res, data, 'Lấy gợi ý thành công');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
};

module.exports = suggestionController; 