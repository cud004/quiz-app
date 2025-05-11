const express = require('express');
const router = express.Router();
const quizAttemptController = require('../controllers/quizAttemptController');
const { 
  protect, 
  validateRequest 
} = require('../middleware');
const { 
  startQuizValidation,
  getQuizAttemptValidation,
  getUserQuizAttemptsValidation,
  submitAnswerValidation,
  completeQuizValidation,
  getQuizResultValidation,
  addFeedbackValidation
} = require('../validations/quizAttemptValidation');

// Tất cả route đều yêu cầu người dùng đăng nhập
router.use(protect);

// Bắt đầu làm bài kiểm tra
router.post('/start', 
  validateRequest(startQuizValidation), 
  quizAttemptController.startQuiz
);

// Lấy danh sách lần làm bài của người dùng
router.get('/', 
  validateRequest(getUserQuizAttemptsValidation), 
  quizAttemptController.getUserQuizAttempts
);

// Lấy thông tin phiên làm bài đang diễn ra
router.get('/:id', 
  validateRequest(getQuizAttemptValidation),
  quizAttemptController.getQuizAttempt
);

// Gửi câu trả lời
router.post('/:id/answer', 
  validateRequest(submitAnswerValidation),
  quizAttemptController.submitAnswer
);

// Kết thúc làm bài
router.post('/:id/complete', 
  validateRequest(completeQuizValidation),
  quizAttemptController.completeQuiz
);

// Lấy kết quả chi tiết bài làm
router.get('/:id/result', 
  validateRequest(getQuizResultValidation),
  quizAttemptController.getQuizResult
);

// Thêm đánh giá về bài kiểm tra
router.post('/:id/feedback', 
  validateRequest(addFeedbackValidation),
  quizAttemptController.addFeedback
);

module.exports = router; 