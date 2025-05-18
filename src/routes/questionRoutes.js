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
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Lấy danh sách câu hỏi
router.get('/', 
  validateRequest(getQuestionsValidation), 
  questionController.getQuestions
);

// Lấy thông tin chi tiết câu hỏi
router.get('/:id',
  protect,
  validateRequest(getQuestionValidation),
  questionController.getQuestion
);

// Cập nhật thống kê câu hỏi
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

// Import câu hỏi (admin only)
router.post('/import', 
  protect,
  authorize(['admin']), 
  validateRequest(importQuestionsValidation), 
  questionController.importQuestions
);

// Import câu hỏi từ file Excel (admin only)
router.post('/import-excel', protect, authorize(['admin']), upload.single('file'), questionController.importQuestionsFromExcel);

// Tạo câu hỏi mới (admin only)
router.post('/', 
  protect,
  authorize(['admin']), 
  validateRequest(createQuestionValidation), 
  questionController.createQuestion
);

// Cập nhật câu hỏi (admin only)
router.put('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(updateQuestionValidation), 
  questionController.updateQuestion
);

// Xóa câu hỏi (admin only)
router.delete('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(deleteQuestionValidation), 
  questionController.deleteQuestion
);

// Thống kê số câu hỏi theo chủ đề
router.get('/count-by-topic',
  protect,
  async (req, res) => {
    try {
      const { topic } = req.query;
      const isActiveOnly = req.query.activeOnly !== 'false';
      
      const stats = await questionService.countQuestionsByTopic(topic, isActiveOnly);
      
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