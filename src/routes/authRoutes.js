const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout,
  registerAdmin
} = require('../controllers/authController');
const { 
  protect, 
  validateRequest,
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter
} = require('../middleware');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  updatePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  oauthLoginValidation
} = require('../validations/authValidation');

// Public routes
router.post('/register', registerLimiter, validateRequest(registerValidation), register);
router.post('/login', loginLimiter, validateRequest(loginValidation), login);
router.post('/forgot-password', forgotPasswordLimiter, validateRequest(forgotPasswordValidation), forgotPassword);
router.put('/reset-password/:token', validateRequest(resetPasswordValidation), resetPassword);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.put('/profile', validateRequest(updateProfileValidation), updateProfile);
router.put('/password', validateRequest(updatePasswordValidation), updatePassword);
router.post('/logout', logout);

// Admin registration (protected by secret key)
router.post('/register-admin', validateRequest(registerValidation), registerAdmin);

module.exports = router; 