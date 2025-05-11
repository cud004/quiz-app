const questionService = require('../services/question/questionService');
const ApiResponse = require('../utils/apiResponse');

const questionController = {
  // Lấy danh sách câu hỏi
  getQuestions: async (req, res) => {
    try {
      const result = await questionService.getQuestions(req.query);
      
      return ApiResponse.paginated(
        res, 
        result.questions,
        result.pagination,
        'Questions retrieved successfully'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },

  // Lấy chi tiết một câu hỏi theo ID
  getQuestion: async (req, res) => {
    try {
      // Xác định xem có hiển thị đáp án không (admin luôn thấy, user không thấy)
      const includeCorrectAnswer = req.user && req.user.role === 'admin';
      
      const result = await questionService.getQuestionById(req.params.id, includeCorrectAnswer);
      
      return ApiResponse.success(
        res,
        {
          question: result.question,
          relatedQuestions: result.relatedQuestions,
          metadata: {
            hasCorrectAnswer: includeCorrectAnswer,
            relatedCount: result.relatedQuestions.length
          }
        },
        'Question retrieved successfully'
      );
    } catch (error) {
      if (error.message === 'Question not found') {
        return ApiResponse.notFound(res, error.message);
      }
      return ApiResponse.error(res, error.message);
    }
  },

  // Tạo câu hỏi mới
  createQuestion: async (req, res) => {
    try {
      // Thêm người tạo vào dữ liệu
      const questionData = {
        ...req.body,
        createdBy: req.user._id
      };
      
      const question = await questionService.createQuestion(questionData);

      return ApiResponse.success(
        res,
        question,
        'Question created successfully',
        201
      );
    } catch (error) {
      // Xử lý các lỗi cụ thể
      if (error.message.includes('Topic with ID') || 
          error.message.includes('Tag with ID')) {
        return ApiResponse.validationError(res, [{ field: 'topics', message: error.message }]);
      }
      
      if (error.message.includes('Correct answer must match')) {
        return ApiResponse.validationError(res, [{ field: 'correctAnswer', message: error.message }]);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },

  // Cập nhật câu hỏi
  updateQuestion: async (req, res) => {
    try {
      const question = await questionService.updateQuestion(req.params.id, req.body);

      return ApiResponse.success(
        res,
        question,
        'Question updated successfully'
      );
    } catch (error) {
      if (error.message === 'Question not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      // Xử lý các lỗi cụ thể
      if (error.message.includes('Topic with ID') || 
          error.message.includes('Tag with ID')) {
        return ApiResponse.validationError(res, [{ field: 'topics', message: error.message }]);
      }
      
      if (error.message.includes('Correct answer must match')) {
        return ApiResponse.validationError(res, [{ field: 'correctAnswer', message: error.message }]);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },

  // Xóa câu hỏi
  deleteQuestion: async (req, res) => {
    try {
      await questionService.deleteQuestion(req.params.id);

      return ApiResponse.success(
        res,
        null,
        'Question deleted successfully'
      );
    } catch (error) {
      if (error.message === 'Question not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      if (error.message.includes('being used')) {
        return ApiResponse.error(res, error.message, 400);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },

  // Import nhiều câu hỏi
  importQuestions: async (req, res) => {
    try {
      const questions = await questionService.importQuestions(
        req.body.questions,
        req.user._id
      );

      return ApiResponse.success(
        res,
        questions,
        'Questions imported successfully',
        201
      );
    } catch (error) {
      // Xử lý các loại lỗi
      if (error.message.includes('Topic with ID') || 
          error.message.includes('Tag with ID')) {
        return ApiResponse.validationError(res, [{ field: 'topics', message: error.message }]);
      }
      
      if (error.message.includes('Correct answer must match')) {
        return ApiResponse.validationError(res, [{ field: 'correctAnswer', message: error.message }]);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Cập nhật thống kê câu hỏi
  updateStats: async (req, res) => {
    try {
      const { isCorrect, timeSpent } = req.body;
      
      await questionService.updateQuestionStats(
        req.params.id,
        isCorrect,
        timeSpent
      );

      return ApiResponse.success(
        res,
        null,
        'Question stats updated successfully'
      );
    } catch (error) {
      if (error.message === 'Question not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      return ApiResponse.error(res, error.message);
    }
  }
};

module.exports = questionController; 