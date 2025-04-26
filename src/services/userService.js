const mongoose = require('mongoose');
const User = require('../models/User');

const ERROR_CODES = {
  INVALID_ID: 'INVALID_ID',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
};

// Create a new user
exports.createUser = async ({ name, email, password, class: userClass, profileImage }) => {
  // Kiểm tra email trùng lặp
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('Email already exists');
    error.errorCode = ERROR_CODES.EMAIL_EXISTS;
    throw error;
  }

  const user = new User({
    name,
    email,
    password,
    class: userClass,
    profileImage,
    role: 'student', // Giá trị mặc định
    isActive: true, // Giá trị mặc định
  });
  await user.save();

  // Trả về thông tin chi tiết của người dùng
  return await User.findById(user._id).select('-password');
};
// Get all users with pagination
exports.getUsers = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (filters.role) {
    query.role = filters.role;
  }
  if (filters.isActive !== undefined) {
    query.isActive = filters.isActive;
  }
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const users = await User.find(query).select('-password').skip(skip).limit(limit);
  const total = await User.countDocuments(query);

  return { users, total, page, limit };
};

// Get a user by ID
exports.getUserById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid ID format');
    error.errorCode = ERROR_CODES.INVALID_ID;
    throw error;
  }
  const user = await User.findById(id).select('-password');
  if (!user) {
    const error = new Error('User not found');
    error.errorCode = ERROR_CODES.USER_NOT_FOUND;
    throw error;
  }
  return user;
};
// Update a user
exports.updateUser = async (id, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid ID format');
    error.errorCode = ERROR_CODES.INVALID_ID;
    throw error;
  }

  if (updateData.email) {
    const existingUser = await User.findOne({ email: updateData.email, _id: { $ne: id } });
    if (existingUser) {
      const error = new Error('Email already exists');
      error.errorCode = ERROR_CODES.EMAIL_EXISTS;
      throw error;
    }
  }

  const allowedUpdates = ['name', 'email', 'class', 'profileImage', 'role', 'isActive'];
  const updates = {};
  for (const key of allowedUpdates) {
    if (updateData[key] !== undefined) {
      updates[key] = updateData[key];
    }
  }

  const user = await User.findByIdAndUpdate(
    id,
    { ...updates, updatedAt: Date.now() },
    { new: true }
  ).select('-password');
  if (!user) {
    const error = new Error('User not found');
    error.errorCode = ERROR_CODES.USER_NOT_FOUND;
    throw error;
  }
  return user;
};

// Delete a user (soft delete using isActive)
exports.deleteUser = async (id, currentUser) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error('Invalid ID format');
    error.errorCode = ERROR_CODES.INVALID_ID;
    throw error;
  }

  const user = await User.findById(id);
  if (!user) {
    const error = new Error('User not found');
    error.errorCode = ERROR_CODES.USER_NOT_FOUND;
    throw error;
  }

  // Kiểm tra quyền hạn: chỉ admin hoặc chính người dùng mới được phép xóa
  if (currentUser.role !== 'admin' && currentUser._id.toString() !== id) {
    const error = new Error('Access denied');
    error.errorCode = ERROR_CODES.FORBIDDEN;
    throw error;
  }

  // Soft delete: cập nhật isActive thành false
  user.isActive = false;
  await user.save();

  return { message: 'User deactivated', userId: id };
};