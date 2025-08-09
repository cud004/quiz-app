const express = require("express");
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
  registerAdmin,
} = require("../controllers/authController");
const {
  protect,
  validateRequest,
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
} = require("../middleware");
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  updatePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  oauthLoginValidation,
} = require("../validations/authValidation");
const passport = require("../config/passport");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

// Public routes
router.post(
  "/register",
  registerLimiter,
  validateRequest(registerValidation),
  register
);
router.post("/login", loginLimiter, validateRequest(loginValidation), login);
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateRequest(forgotPasswordValidation),
  forgotPassword
);
router.put(
  "/reset-password/:token",
  validateRequest(resetPasswordValidation),
  resetPassword
);

// Github OAuth login
router.get(
  "/github",
  (req, res, next) => {
    // Lưu frontend URL vào state
    const frontendUrl = req.query.frontend_url || 'http://localhost:5173';
    const state = Buffer.from(JSON.stringify({ frontendUrl })).toString('base64');
    req.session.oauthState = state;
    next();
  },
  passport.authenticate("github", { 
    scope: ["user:email"],
    state: true 
  })
);

// Github OAuth callback
router.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/login",
    session: false,
  }),
  async (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );
    
    // Lấy frontend URL từ state
    const state = req.query.state;
    let frontendUrl = 'http://localhost:5173';
    
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        frontendUrl = decodedState.frontendUrl;
      } catch (error) {
        console.error('Error decoding state:', error);
      }
    }
    
    res.redirect(`${frontendUrl}/oauth-success?token=${token}`);
  }
);

// Google OAuth login
router.get(
  "/google",
  (req, res, next) => {
    // Lưu frontend URL vào state
    const frontendUrl = req.query.frontend_url || 'http://localhost:5173';
    const state = Buffer.from(JSON.stringify({ frontendUrl })).toString('base64');
    req.session.oauthState = state;
    next();
  },
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    state: true 
  })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  async (req, res) => {
    const user = req.user;
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );
    
    // Lấy frontend URL từ state
    const state = req.query.state;
    let frontendUrl = 'http://localhost:5173';
    
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        frontendUrl = decodedState.frontendUrl;
      } catch (error) {
        console.error('Error decoding state:', error);
      }
    }
    
    res.redirect(`${frontendUrl}/oauth-success?token=${token}`);
  }
);

// Protected routes
router.use(protect);
router.get("/me", getMe);
router.put("/profile", protect, upload.single("profileImage"), updateProfile);
router.put(
  "/password",
  validateRequest(updatePasswordValidation),
  updatePassword
);
router.post("/logout", logout);

// Admin registration (protected by secret key)
router.post(
  "/register-admin",
  validateRequest(registerValidation),
  registerAdmin
);

module.exports = router;
