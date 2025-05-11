const ApiResponse = require('../utils/apiResponse');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log for development
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Application-specific errors
  if (err.name === 'SubscriptionError') {
    error = { message: err.message, statusCode: 403 };
  }

  if (err.name === 'ExamAccessError') {
    error = { message: err.message, statusCode: 403 };
  }

  if (err.name === 'PaymentError') {
    error = { message: err.message, statusCode: 400 };
  }

  return ApiResponse.error(
    res, 
    error.message || 'Server Error',
    error.statusCode || 500
  );
};

module.exports = errorHandler; 