const User = require('../models/User');
const AuthService = require('../services/auth/authService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ApiResponse = require('../utils/apiResponse');
const ImageService = require('../services/user/imageService');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return ApiResponse.badRequest(res, 'User already exists');
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user',
      status: 'active',
      isActive: true,
      preferences: {
        theme: 'system',
        language: 'vi',
        notifications: {
          email: true,
          push: true
        }
      }
    });

    // Generate token
    const token = generateToken(user._id);

    // Gửi email chào mừng
    try {
      await AuthService.sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Lỗi gửi email chào mừng:', emailError);
      // Không trả về lỗi vì đăng ký vẫn thành công
    }

    return ApiResponse.success(
      res,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          preferences: user.preferences
        }
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return ApiResponse.unauthorized(res, 'Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive || user.status !== 'active') {
      return ApiResponse.unauthorized(res, 'Your account is inactive. Please contact support.');
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return ApiResponse.unauthorized(res, 'Invalid credentials');
    }

    // Update last login
    user.lastLogin = Date.now();
    user.lastActive = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    return ApiResponse.success(
      res,
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          preferences: user.preferences,
          subscription: user.subscription
        }
      },
      'Login successful'
    );
  } catch (error) {
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('subscription.package');

    // Lấy thông tin gói đăng ký
    let subscriptionInfo = null;
    if (user.subscription && user.subscription.package) {
      subscriptionInfo = {
        name: user.subscription.package.name,
        status: user.subscription.status,
        startDate: user.subscription.startDate,
        endDate: user.subscription.endDate,
        isActive: user.subscription.status === 'active',
        autoRenew: user.subscription.autoRenew || false
      };
    } else {
      subscriptionInfo = { name: 'free', status: 'free', isActive: true };
    }

    // Lấy thông tin avatar nếu có
    let profileImage = null;
    if (user.profileImage && user.profileImage.url) {
      profileImage = {
        url: user.profileImage.url,
        thumbnailUrl: user.profileImage.thumbnailUrl,
        fileId: user.profileImage.fileId,
        uploadedAt: user.profileImage.uploadedAt
      };
    }

    return ApiResponse.success(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          username: user.username || '',
          email: user.email,
          role: user.role,
          preferences: user.preferences,
          profileImage,
          subscription: subscriptionInfo
        }
      },
      'User profile retrieved successfully'
    );
  } catch (error) {
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Nếu có file upload, xử lý upload lên ImageKit
    if (req.file) {
      const imageData = await ImageService.uploadImage(
        req.file.buffer,
        req.file.originalname
      );
      updateData.profileImage = {
        url: imageData.url,
        thumbnailUrl: imageData.thumbnailUrl,
        fileId: imageData.fileId,
        uploadedAt: new Date()
      };
    }

    // Cập nhật user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Check current password
    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Lưu token đã hash và thời gian hết hạn
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    try {
      // Gửi email đặt lại mật khẩu
      await AuthService.sendPasswordResetEmail(user.email, resetToken);
      
      return ApiResponse.success(
        res, 
        null, 
        'Đã gửi email hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.'
      );
    } catch (emailError) {
      console.error('Lỗi gửi email:', emailError);
      
      // Nếu môi trường là development, trả về token để test
      if (process.env.NODE_ENV === 'development') {
        return ApiResponse.success(
          res, 
          {
            resetToken,
            resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`
          },
          'Email không gửi được. Token đặt lại mật khẩu (chỉ dùng cho testing)'
        );
      } else {
        // Trong môi trường production, không trả về token nhưng thông báo lỗi
        return ApiResponse.error(
          res, 
          'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau.',
          500
        );
      }
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return ApiResponse.error(res, error.message, 500);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    // Hash token from params
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return ApiResponse.badRequest(res, 'Invalid or expired token');
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return ApiResponse.success(
      res,
      null,
      'Mật khẩu đã được đặt lại thành công'
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return ApiResponse.error(res, error.message, 500);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // Update last active time
    await User.findByIdAndUpdate(req.user.id, {
      lastActive: Date.now()
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Register admin (protected by secret key)
// @route   POST /api/auth/register-admin
// @access  Private/SuperAdmin
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body;

    // Verify secret key
    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(401).json({
        success: false,
        message: 'Invalid secret key'
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create admin user
    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin',
      status: 'active',
      isActive: true,
      preferences: {
        theme: 'system',
        language: 'vi',
        notifications: {
          email: true,
          push: true
        }
      }
    });

    // Generate token
    const token = generateToken(admin._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        preferences: admin.preferences
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  logout,
  registerAdmin
};