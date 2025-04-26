const express = require('express');
const examController = require('../controllers/examController');
const router = express.Router();

router.post('/', examController.createExam); // Tạo đề kiểm tra thủ công
router.post('/random', examController.createRandomExam); // Tạo đề kiểm tra ngẫu nhiên
router.get('/', examController.getExams); // Lấy danh sách đề kiểm tra
router.get('/:id', examController.getExamById); // Lấy chi tiết một đề kiểm tra
router.put('/:id', examController.updateExam); // Cập nhật đề kiểm tra
router.delete('/:id', examController.deleteExam); // Xóa một đề kiểm tra

module.exports = router;