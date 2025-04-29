const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Admin routes (protected by auth and adminAuth)
router.post('/', auth, adminAuth, tagController.createTag);
router.put('/:id', auth, adminAuth, tagController.updateTag);
router.delete('/:id', auth, adminAuth, tagController.deleteTag);

// Public routes (protected by auth only) - Chỉ cho phép xem
router.get('/', auth, tagController.getTags);
router.get('/topic/:topicId', auth, tagController.getTagsByTopic);
router.get('/:id', auth, tagController.getTagById);

module.exports = router;