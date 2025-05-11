const express = require('express');
const router = express.Router();
const learningPathController = require('../controllers/learningPathController');
const { protect } = require('../middleware');

// Tất cả các routes đều yêu cầu xác thực
router.use(protect);

// Lấy lộ trình học tập của người dùng
router.get('/', learningPathController.getLearningPath);

// Cập nhật hoặc tạo mới lộ trình học tập
router.post('/update', learningPathController.updateLearningPath);

// Thêm một chủ đề vào lộ trình học tập
router.post('/topics', learningPathController.addTopicToPath);

// Cập nhật tiến độ cho một chủ đề trong lộ trình
router.patch('/topics/:topicId/progress', learningPathController.updateTopicProgress);

// Cập nhật ưu tiên cho một chủ đề trong lộ trình
router.patch('/topics/:topicId/priority', learningPathController.updateTopicPriority);

// Xóa một chủ đề khỏi lộ trình học tập
router.delete('/topics/:topicId', learningPathController.removeTopicFromPath);

module.exports = router; 