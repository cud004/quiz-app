const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  restoreUser,
  getDeletedUsers,
  hardDeleteUser,
  getUserStats,
  updatePreferences,
  toggleFavoriteExam
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateUserUpdate } = require('../middleware/validation');

// Apply protect middleware to all routes
router.use(protect);

// Admin only routes
router.get('/', authorize('admin'), getUsers);
router.get('/deleted', authorize('admin'), getDeletedUsers);
router.get('/:id', authorize('admin'), getUser);
router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);
router.put('/:id/restore', authorize('admin'), restoreUser);
router.delete('/:id/hard', authorize('admin'), hardDeleteUser);
router.get('/:id/stats', authorize('admin'), getUserStats);

// User routes (accessible by both users and admins)
router.put('/preferences', updatePreferences);
router.put('/favorite-exam/:examId', toggleFavoriteExam);

module.exports = router; 