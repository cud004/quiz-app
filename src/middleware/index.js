/**
 * Centralized middleware exports
 * This file exports all middleware from a single point for easier imports
 */

// Import middleware from individual files
const auth = require('./auth');
const { validateRequest } = require('./validator');
const errorHandler = require('./errorHandler');
const rateLimiters = require('./rateLimiter');

// Export all middleware
module.exports = {
  // Auth middleware
  protect: auth.protect,
  authorize: auth.authorize,
  requireSubscription: auth.requireSubscription,
  canAccessExam: auth.canAccessExam,
  admin: auth.admin,
  
  // Validation middleware
  validateRequest,
  
  // Error handling middleware
  errorHandler,
  
  // Rate limiters
  loginLimiter: rateLimiters.loginLimiter,
  registerLimiter: rateLimiters.registerLimiter,
  forgotPasswordLimiter: rateLimiters.forgotPasswordLimiter,
  apiLimiter: rateLimiters.apiLimiter
}; 