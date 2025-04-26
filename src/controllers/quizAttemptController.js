const quizAttemptService = require('../services/quizAttemptService');

// Tạo một lần làm bài kiểm tra
exports.createQuizAttempt = async (req, res) => {
  try {
    const { userId, examId, answers, timeTaken } = req.body;
    const quizAttempt = await quizAttemptService.createQuizAttempt({
      userId,
      examId,
      answers,
      timeTaken,
    });
    res.status(201).json(quizAttempt);
  } catch (error) {
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// Lấy danh sách các lần làm bài kiểm tra của một người dùng
exports.getQuizAttemptsByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const quizAttempts = await quizAttemptService.getQuizAttemptsByUser(userId, page, limit);
    res.json(quizAttempts);
  } catch (error) {
    res.status(500).json({ errorCode: 'SERVER_ERROR', message: error.message });
  }
};

// Lấy chi tiết một lần làm bài kiểm tra
exports.getQuizAttemptById = async (req, res) => {
  try {
    const attemptId = req.params.id;
    const quizAttempt = await quizAttemptService.getQuizAttemptById(attemptId);
    res.json(quizAttempt);
  } catch (error) {
    res.status(404).json({ errorCode: 'NOT_FOUND', message: error.message });
  }
};