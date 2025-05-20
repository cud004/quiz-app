const rateLimit = require('express-rate-limit');

/**
 * Rate limiters for various API endpoints
 */

// Auth rate limiters
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 5 attempts
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  }
});

exports.registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts
  message: {
    success: false,
    message: 'Too many registration attempts, please try again after 1 hour'
  }
});

exports.forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after 1 hour'
  }
});

// General API rate limiter
exports.apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
}); 