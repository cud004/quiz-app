const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Đăng ký người dùng mới
exports.registerUser = async (userData, adminCode) => {
  const { name, email, password, class: userClass, profileImage } = userData;

  // Kiểm tra email đã tồn tại chưa
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw { errorCode: 'EMAIL_EXISTS', message: 'Email already exists' };
  }

  // Xác định role
  let role = 'student';
  if (adminCode === process.env.ADMIN_CODE) {
    role = 'admin';
  }

  // Tạo người dùng mới
  const user = new User({
    name,
    email,
    password,
    class: userClass,
    profileImage,
    role,
    isActive: true,
  });

  await user.save();

  return user;
};

// Đăng nhập
exports.loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !user.isActive) {
    throw { errorCode: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { errorCode: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  return user;
};

// Tạo JWT token
exports.generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};