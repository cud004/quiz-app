const User = require('../../models/User');
const QuizAttempt = require('../../models/QuizAttempt');
const Exam = require('../../models/Exam');

class UserService {
  // Get all users
  static async getAllUsers() {
    try {
      const users = await User.find({})
        .select('-password')
        .populate('subscription.package')
        .populate('examHistory.exam')
        .populate('favoriteExams')
        .sort({ createdAt: -1 });

      return users;
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw new Error('Failed to fetch users');
    }
  }

  // Get user by ID
  static async getUserById(userId) {
    try {
      const user = await User.findOne({ _id: userId })
        .select('-password')
        .populate('subscription.package')
        .populate('examHistory.exam')
        .populate('favoriteExams');

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  }

  // Update user
  static async updateUser(userId, updateData) {
    try {
      const user = await User.findOneAndUpdate(
        { _id: userId },
        updateData,
        {
          new: true,
          runValidators: true
        }
      )
        .select('-password')
        .populate('subscription.package');

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }

  // Soft delete user
  static async softDeleteUser(userId) {
    try {
      const user = await User.findOne({ _id: userId });
      if (!user) {
        throw new Error('User not found');
      }
      await user.softDelete();
    } catch (error) {
      console.error('Error in softDeleteUser:', error);
      throw error;
    }
  }

  // Get deleted users
  static async getDeletedUsers() {
    try {
      // Override the pre-find middleware by using findOne with explicit conditions
      const users = await User.find({ 'deleted.isDeleted': true })
        .select('-password')
        .populate('subscription.package')
        .sort({ 'deleted.deletedAt': -1 });

      if (!users || users.length === 0) {
        return []; // Return empty array instead of throwing error
      }

      return users;
    } catch (error) {
      console.error('Error in getDeletedUsers:', error);
      throw new Error('Failed to fetch deleted users');
    }
  }

  // Restore deleted user
  static async restoreUser(userId) {
    try {
      const user = await User.findOne({ 
        _id: userId,
        'deleted.isDeleted': true 
      });

      if (!user) {
        throw new Error('Deleted user not found');
      }

      await user.restore();
      return user;
    } catch (error) {
      console.error('Error in restoreUser:', error);
      throw error;
    }
  }

  // Hard delete user
  static async hardDeleteUser(userId) {
    try {
      const user = await User.findOne({ _id: userId });
      if (!user) {
        throw new Error('User not found');
      }
      await user.remove();
    } catch (error) {
      console.error('Error in hardDeleteUser:', error);
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats(userId) {
    try {
      const user = await User.findOne({ _id: userId })
        .select('learningStats examHistory');

      if (!user) {
        throw new Error('User not found');
      }

      // Get recent quiz attempts
      const recentAttempts = await QuizAttempt.find({ user: userId })
        .sort('-createdAt')
        .limit(5)
        .populate('exam', 'title');

      // Get favorite exams
      const favoriteExams = await Exam.find({ _id: { $in: user.favoriteExams } })
        .select('title difficulty stats');

      return {
        learningStats: user.learningStats,
        examHistory: user.examHistory,
        recentAttempts,
        favoriteExams
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      throw error;
    }
  }

  // Update user preferences
  static async updatePreferences(userId, preferences) {
    try {
      const user = await User.findOneAndUpdate(
        { _id: userId },
        { preferences },
        {
          new: true,
          runValidators: true
        }
      ).select('preferences');

      if (!user) {
        throw new Error('User not found');
      }

      return user.preferences;
    } catch (error) {
      console.error('Error in updatePreferences:', error);
      throw error;
    }
  }

  // Toggle favorite exam
  static async toggleFavoriteExam(userId, examId) {
    try {
      const user = await User.findOne({ _id: userId });
      if (!user) {
        throw new Error('User not found');
      }

      // Check if exam exists
      const exam = await Exam.findById(examId);
      if (!exam) {
        throw new Error('Exam not found');
      }

      // Check if exam is already in favorites
      const isFavorite = user.favoriteExams.includes(examId);

      if (isFavorite) {
        // Remove from favorites
        user.favoriteExams = user.favoriteExams.filter(
          id => id.toString() !== examId
        );
      } else {
        // Add to favorites
        user.favoriteExams.push(examId);
      }

      await user.save();

      return {
        isFavorite: !isFavorite,
        favoriteExams: user.favoriteExams
      };
    } catch (error) {
      console.error('Error in toggleFavoriteExam:', error);
      throw error;
    }
  }
}

module.exports = UserService; 