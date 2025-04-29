const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');

// Cấu hình multer cho upload file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  }
});

// Admin routes (protected by auth and adminAuth)
router.post('/', auth, adminAuth, questionController.createQuestion);
router.post('/bulk', auth, adminAuth, questionController.createManyQuestions);
router.post('/import', auth, adminAuth, upload.single('file'), questionController.importQuestionsFromFile);
router.put('/:id', auth, adminAuth, questionController.updateQuestion);
router.delete('/:id', auth, adminAuth, questionController.deleteQuestion);
router.delete('/bulk-delete', auth, adminAuth, questionController.deleteManyQuestions);

// Public routes (protected by auth only) - Chỉ cho phép xem
router.get('/', auth, questionController.getQuestions);
router.get('/:id', auth, questionController.getQuestionById);

module.exports = router;