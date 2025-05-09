const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const { loginLimiter, registerLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const authValidation = require('../validations/authValidation');

// Public routes
router.post(
  '/register',
  registerLimiter,
  validate(authValidation.register),
  authController.register
);

router.post(
  '/login',
  loginLimiter,
  validate(authValidation.login),
  authController.login
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);

router.post(
  '/reset-password/:resetToken',
  validate(authValidation.resetPassword),
  authController.resetPassword
);

// Protected routes
router.get('/me', protect, authController.getMe);

router.put(
  '/profile',
  protect,
  validate(authValidation.updateProfile),
  authController.updateProfile
);

router.put(
  '/password',
  protect,
  validate(authValidation.updatePassword),
  authController.updatePassword
);

router.post('/logout', protect, authController.logout);

module.exports = router; 