const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // Lấy token từ header hoặc cookie
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        errorCode: 'NO_TOKEN',
        message: 'Authentication token is required'
      });
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        errorCode: 'INVALID_TOKEN',
        message: 'User not found or inactive'
      });
    }

    // Lưu thông tin user vào request
    req.user = user;
    next();
  } catch (error) {
    console.error(`[${req.method}] ${req.url} - Authentication error:`, error);

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        errorCode: 'TOKEN_EXPIRED',
        message: 'Token has expired'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        errorCode: 'INVALID_TOKEN',
        message: 'Invalid token'
      });
    }

    res.status(401).json({
      errorCode: 'AUTH_ERROR',
      message: 'Authentication failed'
    });
  }
};