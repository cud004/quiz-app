const UserService = require('../services/user/userService');
const QuizAttempt = require('../models/QuizAttempt');
const Exam = require('../models/Exam');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await UserService.getAllUsers();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error in getUsers controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
const getUser = async (req, res) => {
  try {
    const user = await UserService.getUserById(req.params.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in getUser controller:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await UserService.updateUser(req.params.id, req.body);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error in updateUser controller:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user'
    });
  }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    await UserService.softDeleteUser(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteUser controller:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user'
    });
  }
};

// @desc    Get deleted users
// @route   GET /api/users/deleted
// @access  Private/Admin
const getDeletedUsers = async (req, res) => {
  try {
    const users = await UserService.getDeletedUsers();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error in getDeletedUsers controller:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch deleted users'
    });
  }
};

// @desc    Hard delete user (permanent delete)
// @route   DELETE /api/users/:id/hard
// @access  Private/Admin
const hardDeleteUser = async (req, res) => {
  try {
    await UserService.hardDeleteUser(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User permanently deleted'
    });
  } catch (error) {
    console.error('Error in hardDeleteUser controller:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user'
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private/Admin
const getUserStats = async (req, res) => {
  try {
    const stats = await UserService.getUserStats(req.params.id);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in getUserStats controller:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user statistics'
    });
  }
};

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
const updatePreferences = async (req, res) => {
  try {
    const preferences = await UserService.updatePreferences(req.user.id, req.body);

    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error in updatePreferences controller:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update preferences'
    });
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

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  restoreUser,
  getDeletedUsers,
  hardDeleteUser,
  getUserStats,
  updatePreferences,
  toggleFavoriteExam
}; 