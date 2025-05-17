const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Exam = require('../models/Exam');
const QuizAttempt = require('../models/QuizAttempt');
const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware to protect routes requiring authentication
 */
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check token exists
  if (!token) {
    return ApiResponse.unauthorized(res, 'Not authorized to access this route');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id)
      .select('-password')
      .populate('subscription');

    if (!req.user) {
      return ApiResponse.unauthorized(res, 'User not found');
    }

    // Check account status
    if (!req.user.isActive || req.user.status !== 'active') {
      return ApiResponse.forbidden(res, 'Your account is inactive. Please contact support.');
    }

    // Check subscription if route requires it
    if (req.requiresSubscription && (!req.user.subscription || req.user.subscription.status !== 'active')) {
      return ApiResponse.forbidden(res, 'This feature requires an active subscription');
    }

    next();
  } catch (err) {
    return ApiResponse.unauthorized(res, 'Not authorized to access this route');
  }
};

/**
 * Middleware to check user roles
 * @param {Array} roles - Array of roles allowed to access the route
 */
exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Not authorized to access this route');
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.forbidden(res, `User role ${req.user.role} is not authorized to access this route`);
    }
    next();
  };
};

/**
 * Middleware to require subscription
 */
exports.requireSubscription = (req, res, next) => {
  req.requiresSubscription = true;
  next();
};

/**
 * Middleware to check exam access permission
 */
exports.canAccessExam = async (req, res, next) => {
  try {
    const examId = req.params.id || req.params.examId; // Sửa dòng này
    const user = req.user;

    const exam = await Exam.findById(examId);
    if (!exam || !exam.isPublished) {
      return ApiResponse.notFound(res, 'Exam not found or inactive');
    }

    // Check if user is admin
    if (user.role === 'admin') {
      return next();
    }

    // Check if user is the creator
    if (exam.createdBy.toString() === user._id.toString()) {
      return next();
    }

    // Check exam access level
    if (exam.accessLevel === 'premium' || exam.accessLevel === 'pro') {
      if (!user.subscription || user.subscription.status !== 'active') {
        return ApiResponse.forbidden(res, 'This exam requires a subscription');
      }
    }

    // Check retry limit
    const attemptCount = await QuizAttempt.countDocuments({
      exam: examId,
      user: user._id
    });

    if (attemptCount >= exam.retryLimit) {
      return ApiResponse.forbidden(res, 'You have reached the maximum number of attempts for this exam');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user is admin
 */
exports.admin = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.unauthorized(res, 'Not authorized to access this route');
  }

  if (req.user.role !== 'admin') {
    return ApiResponse.forbidden(res, 'Only admin users can access this route');
  }
  
  next();
}; 