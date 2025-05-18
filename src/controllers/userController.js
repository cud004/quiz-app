const UserService = require('../services/user/userService');
const QuizAttempt = require('../models/QuizAttempt');
const Exam = require('../models/Exam');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const ImageService = require('../services/user/imageService');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ 'deleted.isDeleted': false });
    
    return ApiResponse.success(res, users, 'Users retrieved successfully');
  } catch (error) {
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }
    
    return ApiResponse.success(res, user, 'User retrieved successfully');
  } catch (error) {
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    
    return ApiResponse.success(res, user, 'User created successfully', 201);
  } catch (error) {
    if (error.code === 11000) {
      return ApiResponse.badRequest(res, 'User with that email already exists');
    }
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Xử lý upload ảnh nếu có
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

    const user = await User.findByIdAndUpdate(
      req.params.id, 
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');
    
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }
    
    return ApiResponse.success(res, user, 'User updated successfully');
  } catch (error) {
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Update profile (for current user)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Xử lý upload ảnh nếu có
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

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    return ApiResponse.success(res, user, 'Profile updated successfully');
  } catch (error) {
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    await UserService.softDeleteUser(req.params.id);
    return ApiResponse.success(res, null, 'User deleted successfully');
  } catch (error) {
    if (error.message === 'User not found') {
      return ApiResponse.notFound(res, 'User not found');
    }
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Get deleted users
// @route   GET /api/users/deleted
// @access  Private/Admin
const getDeletedUsers = async (req, res) => {
  try {
    const users = await UserService.getDeletedUsers();
    return ApiResponse.success(res, users, 'Deleted users retrieved successfully');
  } catch (error) {
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Hard delete user (permanent delete)
// @route   DELETE /api/users/:id/hard
// @access  Private/Admin
const hardDeleteUser = async (req, res) => {
  try {
    await UserService.hardDeleteUser(req.params.id);
    return ApiResponse.success(res, null, 'User permanently deleted');
  } catch (error) {
    if (error.message === 'User not found') {
      return ApiResponse.notFound(res, 'User not found');
    }
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private/Admin
const getUserStats = async (req, res) => {
  try {
    const stats = await UserService.getUserStats(req.params.id);
    return ApiResponse.success(res, stats, 'User statistics retrieved successfully');
  } catch (error) {
    if (error.message === 'User not found') {
      return ApiResponse.notFound(res, 'User not found');
    }
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
const updatePreferences = async (req, res) => {
  try {
    const preferences = await UserService.updatePreferences(req.user.id, req.body);
    return ApiResponse.success(res, preferences, 'User preferences updated successfully');
  } catch (error) {
    if (error.message === 'User not found') {
      return ApiResponse.notFound(res, 'User not found');
    }
    return ApiResponse.error(res, error.message);
  }
};

// @desc    Toggle favorite exam
// @route   PUT /api/users/favorite-exam/:examId
// @access  Private
const toggleFavoriteExam = async (req, res) => {
  try {
    const result = await UserService.toggleFavoriteExam(req.user.id, req.params.examId);

    res.status(200).json({
      success: true,
      message: result.isFavorite ? 'Exam added to favorites' : 'Exam removed from favorites',
      data: result.favoriteExams
    });
  } catch (error) {
    console.error('Error in toggleFavoriteExam controller:', error);
    if (error.message === 'User not found' || error.message === 'Exam not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle favorite exam'
    });
  }
};

// @desc    Restore deleted user
// @route   PUT /api/users/:id/restore
// @access  Private/Admin
const restoreUser = async (req, res) => {
  try {
    const user = await UserService.restoreUser(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User restored successfully',
      data: user
    });
  } catch (error) {
    console.error('Error in restoreUser controller:', error);
    if (error.message === 'Deleted user not found') {
      return res.status(404).json({
        success: false,
        message: 'Deleted user not found'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore user'
    });
  }
};

/**
 * @desc    Upload profile image
 * @route   POST /api/users/profile/image
 * @access  Private
 */
const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return ApiResponse.badRequest(res, 'Please upload an image file');
    }

    // Upload to ImageKit
    const imageData = await ImageService.uploadImage(
      req.file.buffer,
      req.file.originalname
    );

    // Update user profile
    const user = await User.findById(req.user.id);
    await user.updateProfileImage(imageData);

    return ApiResponse.success(
      res,
      {
        profileImage: user.profileImage
      },
      'Profile image uploaded successfully'
    );
  } catch (error) {
    return ApiResponse.error(res, error.message);
  }
};

/**
 * @desc    Remove profile image
 * @route   DELETE /api/users/profile/image
 * @access  Private
 */
const removeProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.profileImage && user.profileImage.fileId) {
      // Delete from ImageKit
      await ImageService.deleteImage(user.profileImage.fileId);
    }

    // Remove from user profile
    await user.removeProfileImage();

    return ApiResponse.success(
      res,
      null,
      'Profile image removed successfully'
    );
  } catch (error) {
    return ApiResponse.error(res, error.message);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  updateProfile,
  deleteUser,
  getDeletedUsers,
  hardDeleteUser,
  getUserStats,
  updatePreferences,
  toggleFavoriteExam,
  restoreUser,
  uploadProfileImage,
  removeProfileImage
}; 