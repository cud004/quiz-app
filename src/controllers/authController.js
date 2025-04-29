const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');

// Schema validation
const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  class: Joi.string().optional(),
  profileImage: Joi.string().optional(),
  adminCode: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

/**
 * Đăng ký người dùng mới
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    // Validate input
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        errorCode: 'VALIDATION_ERROR', 
        message: error.details[0].message 
      });
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ 
        errorCode: 'EMAIL_EXISTS', 
        message: 'Email already exists' 
      });
    }

    // Xác định role (mặc định là student)
    let role = 'student';
    
    // Nếu có adminCode và đúng, set role là admin
    // Trong thực tế, adminCode nên được lưu trong biến môi trường
    if (req.body.adminCode === 'admin123') {
      role = 'admin';
    }

    // Tạo người dùng mới
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password, // Password sẽ được hash trong model
      class: req.body.class,
      profileImage: req.body.profileImage,
      role: role,
      isActive: true
    });

    // Lưu vào database
    await user.save();

    // Tạo JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Trả về thông tin người dùng (không bao gồm password)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      class: user.class,
      profileImage: user.profileImage,
      role: user.role,
      token: token
    };

    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ 
      errorCode: 'SERVER_ERROR', 
      message: error.message 
    });
  }
};

/**
 * Đăng nhập
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    // Validate input
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        errorCode: 'VALIDATION_ERROR', 
        message: error.details[0].message 
      });
    }

    // Tìm người dùng theo email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(401).json({ 
        errorCode: 'INVALID_CREDENTIALS', 
        message: 'Invalid email or password' 
      });
    }

    // Kiểm tra người dùng có active không
    if (!user.isActive) {
      return res.status(401).json({ 
        errorCode: 'ACCOUNT_INACTIVE', 
        message: 'Account is inactive' 
      });
    }

    // Kiểm tra mật khẩu
    const isMatch = await user.matchPassword(req.body.password);
    if (!isMatch) {
      return res.status(401).json({ 
        errorCode: 'INVALID_CREDENTIALS', 
        message: 'Invalid email or password' 
      });
    }

    // Tạo token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Trả về thông tin người dùng (không bao gồm password)
    const userObject = user.toObject();
    delete userObject.password;

    res.json({
      user: userObject,
      token
    });
  } catch (error) {
    res.status(500).json({ 
      errorCode: 'SERVER_ERROR', 
      message: error.message 
    });
  }
};

/**
 * Đổi mật khẩu
 * @route POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    // Validate input
    const { error } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        errorCode: 'VALIDATION_ERROR', 
        message: error.details[0].message 
      });
    }

    // Lấy người dùng từ middleware auth
    const user = req.user;

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      return res.status(400).json({ 
        errorCode: 'INVALID_PASSWORD', 
        message: 'Current password is incorrect' 
      });
    }

    // Cập nhật mật khẩu mới
    user.password = req.body.newPassword;
    await user.save();

    res.json({ 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      errorCode: 'SERVER_ERROR', 
      message: error.message 
    });
  }
};

/**
 * Lấy thông tin người dùng hiện tại
 * @route GET /api/auth/me
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // Lấy người dùng từ middleware auth
    const user = req.user;

    // Trả về thông tin người dùng (không bao gồm password)
    const userObject = user.toObject();
    delete userObject.password;

    res.json({ user: userObject });
  } catch (error) {
    res.status(500).json({ 
      errorCode: 'SERVER_ERROR', 
      message: error.message 
    });
  }
};
