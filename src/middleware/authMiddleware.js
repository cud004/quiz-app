const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Exam = require('../models/Exam');
const QuizAttempt = require('../models/QuizAttempt');

// Middleware bảo vệ route
exports.protect = async (req, res, next) => {
  let token;

  // Kiểm tra token trong header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Kiểm tra token tồn tại
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Lấy thông tin user từ token
    req.user = await User.findById(decoded.id)
      .select('-password')
      .populate('subscription');

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Kiểm tra trạng thái tài khoản
    if (!req.user.isActive || req.user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact support.'
      });
    }

    // Kiểm tra subscription nếu route yêu cầu
    if (req.requiresSubscription && (!req.user.subscription || req.user.subscription.status !== 'active')) {
      return res.status(403).json({
        success: false,
        message: 'This feature requires an active subscription'
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Middleware kiểm tra role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Middleware kiểm tra subscription
exports.requireSubscription = (req, res, next) => {
  req.requiresSubscription = true;
  next();
};

// Middleware kiểm tra quyền truy cập exam
exports.canAccessExam = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const user = req.user;

    const exam = await Exam.findById(examId);
    if (!exam || !exam.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found or inactive'
      });
    }

    // Kiểm tra nếu user là admin
    if (user.role === 'admin') {
      return next();
    }

    // Kiểm tra nếu user là người tạo exam
    if (exam.createdBy.toString() === user._id.toString()) {
      return next();
    }

    // Kiểm tra access level của exam
    if (exam.accessLevel === 'premium' || exam.accessLevel === 'pro') {
      if (!user.subscription || user.subscription.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'This exam requires a subscription'
        });
      }
    }

    // Kiểm tra retry limit
    const attemptCount = await QuizAttempt.countDocuments({
      exam: examId,
      user: user._id
    });

    if (attemptCount >= exam.retryLimit) {
      return res.status(403).json({
        success: false,
        message: 'You have reached the maximum number of attempts for this exam'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}; 