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
const { 
  protect, 
  authorize, 
  validateRequest 
} = require('../middleware');
const {
  getUserValidation,
  updateUserValidation,
  deleteUserValidation,
  restoreUserValidation,
  hardDeleteUserValidation,
  getUserStatsValidation,
  updatePreferencesValidation,
  toggleFavoriteExamValidation
} = require('../validations/userValidation');

// Apply protect middleware to all routes
router.use(protect);

// Admin only routes
router.get('/', authorize(['admin']), getUsers);
router.get('/deleted', authorize(['admin']), getDeletedUsers);
router.get('/:id', authorize(['admin']), validateRequest(getUserValidation), getUser);
router.put('/:id', authorize(['admin']), validateRequest(updateUserValidation), updateUser);
router.delete('/:id', authorize(['admin']), validateRequest(deleteUserValidation), deleteUser);
router.put('/:id/restore', authorize(['admin']), validateRequest(restoreUserValidation), restoreUser);
router.delete('/:id/hard', authorize(['admin']), validateRequest(hardDeleteUserValidation), hardDeleteUser);
router.get('/:id/stats', authorize(['admin']), validateRequest(getUserStatsValidation), getUserStats);

// User routes (accessible by both users and admins)
router.put('/preferences', validateRequest(updatePreferencesValidation), updatePreferences);
router.put('/favorite-exam/:examId', validateRequest(toggleFavoriteExamValidation), toggleFavoriteExam);

module.exports = router; 