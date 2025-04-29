const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Admin routes (protected by auth and adminAuth)
router.post('/', auth, adminAuth, topicController.createTopic);
router.put('/:id', auth, adminAuth, topicController.updateTopic);
router.delete('/:id', auth, adminAuth, topicController.deleteTopic);

// Public routes (protected by auth only) - Chỉ cho phép xem
router.get('/', auth, topicController.getTopics);
router.get('/:id', auth, topicController.getTopicById);

module.exports = router;