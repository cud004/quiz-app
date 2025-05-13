const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { 
  protect, 
  authorize, 
  validateRequest 
} = require('../middleware');
const { 
  createQuestionValidation,
  updateQuestionValidation,
  deleteQuestionValidation,
  getQuestionValidation,
  getQuestionsValidation,
  importQuestionsValidation
} = require('../validations/questionValidation');
const questionService = require('../services/question/questionService');
const ApiResponse = require('../utils/apiResponse');

// Public routes
router.get('/', 
  validateRequest(getQuestionsValidation), 
  questionController.getQuestions
);

// Protected routes
router.get('/:id',
  protect, // Người dùng phải đăng nhập để xem chi tiết câu hỏi
  validateRequest(getQuestionValidation),
  questionController.getQuestion
);

// Stats update
router.post('/:id/stats',
  protect,
  validateRequest({
    params: getQuestionValidation.params,
    body: {
      isCorrect: true,
      timeSpent: true
    }
  }),
  questionController.updateStats
);

// Admin routes
router.post('/import', 
  protect,
  authorize(['admin']), 
  validateRequest(importQuestionsValidation), 
  questionController.importQuestions
);

router.post('/', 
  protect,
  authorize(['admin']), 
  validateRequest(createQuestionValidation), 
  questionController.createQuestion
);

router.put('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(updateQuestionValidation), 
  questionController.updateQuestion
);

router.delete('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(deleteQuestionValidation), 
  questionController.deleteQuestion
);

// Thêm route mới để đếm số câu hỏi theo chủ đề
router.get('/count-by-topics',
  protect,
  async (req, res) => {
    try {
      const { topics } = req.query;
      const topicIds = topics ? topics.split(',') : [];
      const isActiveOnly = req.query.activeOnly !== 'false';
      
      const stats = await questionService.countQuestionsByTopics(topicIds, isActiveOnly);
      
      return ApiResponse.success(
        res,
        stats,
        'Question statistics retrieved successfully'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
);

// Sinh giải thích tự động cho câu hỏi bằng Gemini AI
router.post('/:id/generate-explanation', protect, questionController.generateExplanation);

module.exports = router; 