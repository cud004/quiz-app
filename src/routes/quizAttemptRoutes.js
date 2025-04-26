const express = require('express');
const quizAttemptController = require('../controllers/quizAttemptController');

const router = express.Router();

// Tạo một lần làm bài kiểm tra
router.post('/', quizAttemptController.createQuizAttempt);

// Lấy danh sách các lần làm bài kiểm tra của một người dùng
router.get('/user/:userId', quizAttemptController.getQuizAttemptsByUser);

// Lấy chi tiết một lần làm bài kiểm tra
router.get('/:id', quizAttemptController.getQuizAttemptById);

module.exports = router;