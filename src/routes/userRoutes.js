const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateProfile,
  deleteUser,
  getDeletedUsers,
  hardDeleteUser,
  getUserStats,
  updatePreferences,
  toggleFavoriteExam,
  restoreUser
} = require('../controllers/userController');
const { 
  protect, 
  authorize, 
  validateRequest 
} = require('../middleware');
const {
  getUserValidation,
  updateUserValidation,
  updateProfileValidation,
  deleteUserValidation,
  restoreUserValidation,
  hardDeleteUserValidation,
  getUserStatsValidation,
  updatePreferencesValidation,
  toggleFavoriteExamValidation
} = require('../validations/userValidation');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload only images.'), false);
    }
  },
});

// Apply protect middleware to all routes
router.use(protect);

// Admin only routes
router.get('/', authorize(['admin']), getUsers);
router.get('/deleted', authorize(['admin']), getDeletedUsers);
router.get('/:id', authorize(['admin']), validateRequest(getUserValidation), getUser);
router.put('/:id', authorize(['admin']), upload.single('image'), validateRequest(updateUserValidation), updateUser);
router.delete('/:id', authorize(['admin']), validateRequest(deleteUserValidation), deleteUser);
router.put('/:id/restore', authorize(['admin']), validateRequest(restoreUserValidation), restoreUser);
router.delete('/:id/hard', authorize(['admin']), validateRequest(hardDeleteUserValidation), hardDeleteUser);
router.get('/:id/stats', authorize(['admin']), validateRequest(getUserStatsValidation), getUserStats);

// User routes (accessible by both users and admins)
router.put('/profile', upload.single('profileImage'), validateRequest(updateProfileValidation), updateProfile);
router.put('/preferences', validateRequest(updatePreferencesValidation), updatePreferences);
router.put('/favorite-exam/:examId', validateRequest(toggleFavoriteExamValidation), toggleFavoriteExam);

module.exports = router; 