const Joi = require('joi');
const quizAttemptService = require('../services/quizAttemptService');

const quizAttemptSchema = Joi.object({
  exam: Joi.string().required(),
  answers: Joi.array().items(
    Joi.object({
      question: Joi.string().required(),
      selectedOption: Joi.number().required()
    })
  ).required(),
  timeTaken: Joi.number().min(0).required()
});

// Tạo một lần làm bài mới
exports.createQuizAttempt = async (req, res) => {
  const { error } = quizAttemptSchema.validate(req.body);
  if (error) return res.status(400).json({ errorCode: 'VALIDATION_ERROR', message: error.details[0].message });

  try {
    // Đảm bảo người dùng chỉ có thể tạo lần làm bài cho chính mình
    const attemptData = {
      ...req.body,
      user: req.user._id
    };
    
    const quizAttempt = await quizAttemptService.createQuizAttempt(attemptData);
    res.status(201).json(quizAttempt);
  } catch (error) {
    if (error.errorCode) {
      return res.status(400).json({ errorCode: error.errorCode, message: error.message });
    }
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// Lấy danh sách các lần làm bài của người dùng hiện tại
exports.getUserQuizAttempts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    // Đảm bảo chỉ lấy các lần làm bài của người dùng hiện tại
    const userId = req.user._id;
    const quizAttempts = await quizAttemptService.getUserQuizAttempts(userId, page, limit);
    res.json(quizAttempts);
  } catch (error) {
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// Lấy chi tiết một lần làm bài
exports.getQuizAttemptById = async (req, res) => {
  try {
    const quizAttempt = await quizAttemptService.getQuizAttemptById(req.params.id);
    
    // Kiểm tra xem lần làm bài có thuộc về người dùng hiện tại không
    if (quizAttempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        errorCode: 'FORBIDDEN', 
        message: 'You do not have permission to access this quiz attempt' 
      });
    }
    
    res.json(quizAttempt);
  } catch (error) {
    if (error.errorCode === 'QUIZ_ATTEMPT_NOT_FOUND') {
      return res.status(404).json({ errorCode: error.errorCode, message: error.message });
    }
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// Admin: Lấy tất cả các lần làm bài (cho mục đích quản trị)
exports.getAllQuizAttempts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const filters = req.query;
  
  try {
    const quizAttempts = await quizAttemptService.getAllQuizAttempts(page, limit, filters);
    res.json(quizAttempts);
  } catch (error) {
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// Admin: Xóa một lần làm bài
exports.deleteQuizAttempt = async (req, res) => {
  try {
    const result = await quizAttemptService.deleteQuizAttempt(req.params.id);
    res.json(result);
  } catch (error) {
    if (error.errorCode === 'QUIZ_ATTEMPT_NOT_FOUND') {
      return res.status(404).json({ errorCode: error.errorCode, message: error.message });
    }
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// User: Xóa lần làm bài của chính mình
exports.deleteUserQuizAttempt = async (req, res) => {
  try {
    // Kiểm tra xem lần làm bài có thuộc về người dùng hiện tại không
    const quizAttempt = await quizAttemptService.getQuizAttemptById(req.params.id);
    
    if (quizAttempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        errorCode: 'FORBIDDEN', 
        message: 'You do not have permission to delete this quiz attempt' 
      });
    }
    
    const result = await quizAttemptService.deleteQuizAttempt(req.params.id);
    res.json(result);
  } catch (error) {
    if (error.errorCode === 'QUIZ_ATTEMPT_NOT_FOUND') {
      return res.status(404).json({ errorCode: error.errorCode, message: error.message });
    }
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};