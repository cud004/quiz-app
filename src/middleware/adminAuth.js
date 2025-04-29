/**
 * Middleware kiểm tra quyền admin
 * Phải sử dụng sau middleware auth.js
 */
const checkRole = (role) => (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        errorCode: 'NO_AUTH',
        message: 'Authentication required'
      });
    }

    if (req.user.role !== role) {
      console.warn(`Access denied for user ${req.user._id} (${req.user.role}) - Required role: ${role}`);
      return res.status(403).json({
        errorCode: 'FORBIDDEN',
        message: `${role} access required`
      });
    }

    next();
  } catch (error) {
    console.error(`[${req.method}] ${req.url} - Authorization error:`, error);
    res.status(500).json({
      errorCode: 'AUTH_ERROR',
      message: 'Authorization check failed'
    });
  }
};

// Export middleware kiểm tra admin
module.exports = checkRole('admin');

// Export hàm checkRole để có thể tái sử dụng cho các role khác
module.exports.checkRole = checkRole;