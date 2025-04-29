const express = require('express');
const quizAttemptController = require('../controllers/quizAttemptController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// User routes (protected by auth) - Chỉ cho phép làm bài và xem kết quả
router.post('/', auth, quizAttemptController.createQuizAttempt);
router.get('/my-attempts', auth, quizAttemptController.getUserQuizAttempts);
router.get('/:id', auth, quizAttemptController.getQuizAttemptById);

// Admin routes (protected by auth and adminAuth)
router.get('/admin/all', auth, adminAuth, quizAttemptController.getAllQuizAttempts);
router.delete('/admin/:id', auth, adminAuth, quizAttemptController.deleteQuizAttempt);

module.exports = router;