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
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Public routes
router.post('/register', registerLimiter, validateRequest(registerValidation), register);
router.post('/login', loginLimiter, validateRequest(loginValidation), login);
router.post('/forgot-password', forgotPasswordLimiter, validateRequest(forgotPasswordValidation), forgotPassword);
router.put('/reset-password/:token', validateRequest(resetPasswordValidation), resetPassword);

// Github OAuth login
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// Github OAuth callback
router.get('/github/callback', passport.authenticate('github', { failureRedirect: '/login', session: false }), async (req, res) => {
  // Đăng nhập thành công, trả về JWT token cho FE
  const user = req.user;
  const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
  // FE có thể lấy token qua query hoặc redirect về FE kèm token
  // Ví dụ: res.redirect(`http://localhost:3000/oauth-success?token=${token}`);
  res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// Google OAuth login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google OAuth callback
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), async (req, res) => {
  const user = req.user;
  const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
  res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.put('/profile', validateRequest(updateProfileValidation), updateProfile);
router.put('/password', validateRequest(updatePasswordValidation), updatePassword);
router.post('/logout', logout);

// Admin registration (protected by secret key)
router.post('/register-admin', validateRequest(registerValidation), registerAdmin);


module.exports = router; 