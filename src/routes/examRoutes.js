const express = require('express');
const examController = require('../controllers/examController');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Routes chỉ dành cho admin
router.post('/', auth, adminAuth, examController.createExam); // Tạo đề kiểm tra thủ công
router.post('/random', auth, adminAuth, examController.createRandomExam); // Tạo đề kiểm tra ngẫu nhiên
router.put('/:id', auth, adminAuth, examController.updateExam); // Cập nhật đề kiểm tra
router.delete('/:id', auth, adminAuth, examController.deleteExam); // Xóa một đề kiểm tra

// Routes có thể truy cập bởi tất cả người dùng đã xác thực
router.get('/', auth, examController.getExams); // Lấy danh sách đề kiểm tra
router.get('/:id', auth, examController.getExamById); // Lấy chi tiết một đề kiểm tra

module.exports = router;