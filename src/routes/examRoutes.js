const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { 
  protect, 
  authorize, 
  validateRequest,
  canAccessExam
} = require('../middleware');
const { 
  createExamValidation,
  updateExamValidation,
  deleteExamValidation,
  getExamValidation,
  getExamsValidation,
  publishExamValidation,
  generateRandomExamValidation,
  duplicateExamValidation,
  updateExamStatsValidation
} = require('../validations/examValidation');

// Public routes (có thể giới hạn hiển thị các đề thi đã published)
router.get('/', 
  validateRequest(getExamsValidation), 
  examController.getExams
);

// Protected routes
router.get('/:id',
  protect,
  canAccessExam, // Người dùng phải đăng nhập để xem chi tiết đề thi
  validateRequest(getExamValidation),
  examController.getExam
);

// Admin routes
router.post('/', 
  protect,
  authorize(['admin']), 
  validateRequest(createExamValidation), 
  examController.createExam
);

router.put('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(updateExamValidation), 
  examController.updateExam
);

router.delete('/:id', 
  protect,
  authorize(['admin']), 
  validateRequest(deleteExamValidation), 
  examController.deleteExam
);

router.put('/:id/publish',
  protect,
  authorize(['admin']),
  validateRequest(publishExamValidation),
  examController.setPublishStatus
);

// Tạo đề thi ngẫu nhiên
router.post('/generate-random',
  protect,
  authorize(['admin']),
  validateRequest(generateRandomExamValidation),
  examController.generateRandomExam
);

// Sao chép đề thi
router.post('/:id/duplicate',
  protect,
  authorize(['admin']),
  validateRequest(duplicateExamValidation),
  examController.duplicateExam
);

// Cập nhật thống kê đề thi
router.put('/:id/stats',
  protect,
  authorize(['admin']),
  validateRequest(updateExamStatsValidation),
  examController.updateExamStats
);

// Lấy thống kê chi tiết của đề thi
router.get('/:id/stats',
  protect,
  authorize(['admin']),
  validateRequest(getExamValidation),
  examController.getExamStats
);

module.exports = router; 