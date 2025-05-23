const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Topic = require('../models/Topic');
const mongoose = require('mongoose');
const QuizAttempt = require('../models/QuizAttempt');
const Payment = require('../models/Payment');
const User = require('../models/User');

class SystemAnalyticsService {
  // Thống kê tổng quan
  static async getOverviewStats(startDate, endDate, topicId) {
    const matchStage = this._buildDateMatchStage(startDate, endDate);
    if (topicId) {
      matchStage.topic = new mongoose.Types.ObjectId(topicId);
    }

    // Thống kê theo topic
    const topicStats = await Topic.aggregate([
      {
        $lookup: {
          from: 'questions',
          localField: '_id',
          foreignField: 'topic',
          as: 'questions'
        }
      },
      {
        $lookup: {
          from: 'exams',
          localField: '_id',
          foreignField: 'topic',
          as: 'exams'
        }
      },
      {
        $project: {
          name: 1,
          questionCount: { $size: '$questions' },
          examCount: { $size: '$exams' },
          averageExamScore: {
            $avg: '$exams.stats.averageScore'
          }
        }
      }
    ]);

    // Thống kê theo độ khó của đề thi
    const difficultyStats = await Exam.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 },
          averageScore: { $avg: '$stats.averageScore' },
          totalAttempts: { $sum: '$stats.totalAttempts' }
        }
      }
    ]);

    // Thống kê doanh thu
    const revenueStats = await Exam.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$price' },
          averagePrice: { $avg: '$price' },
          examCount: { $sum: 1 }
        }
      }
    ]);

    // Thống kê câu hỏi
    const questionStats = await Question.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 },
          averageUsage: { $avg: '$usageCount' }
        }
      }
    ]);

    // Tổng số lượt làm bài
    const totalQuizAttempts = await QuizAttempt.countDocuments();

    // Tổng số đề thi
    const totalExams = await Exam.countDocuments();

    // Tổng số câu hỏi
    const totalQuestions = await Question.countDocuments();

    // Tổng doanh thu (mọi thời gian)
    const totalRevenueAgg = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // Doanh thu mới (trong tháng hiện tại)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newRevenueAgg = await Payment.aggregate([
      { $match: {
          status: 'completed',
          createdAt: { $gte: firstDayOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const newRevenue = newRevenueAgg[0]?.total || 0;

    // Tổng số người dùng
    const totalUsers = await User.countDocuments();

    return {
      totalQuizAttempts,
      totalExams,
      totalQuestions,
      totalRevenue,
      newRevenue,
      totalUsers
    };
  }

  // Thống kê chi tiết theo topic
  static async getTopicStats(startDate, endDate) {
    const matchStage = this._buildDateMatchStage(startDate, endDate);

    return await Topic.aggregate([
      {
        $lookup: {
          from: 'questions',
          localField: '_id',
          foreignField: 'topic',
          as: 'questions'
        }
      },
      {
        $lookup: {
          from: 'exams',
          localField: '_id',
          foreignField: 'topic',
          as: 'exams'
        }
      },
      {
        $project: {
          name: 1,
          questionCount: { $size: '$questions' },
          examCount: { $size: '$exams' },
          averageExamScore: {
            $avg: '$exams.stats.averageScore'
          },
          totalRevenue: {
            $sum: '$exams.price'
          },
          difficultyBreakdown: {
            $reduce: {
              input: '$exams',
              initialValue: {
                easy: 0,
                medium: 0,
                hard: 0
              },
              in: {
                $mergeObjects: [
                  '$$value',
                  {
                    $switch: {
                      branches: [
                        {
                          case: { $eq: ['$$this.difficulty', 'easy'] },
                          then: { easy: { $add: [{ $ifNull: ['$$value.easy', 0] }, 1] } }
                        },
                        {
                          case: { $eq: ['$$this.difficulty', 'medium'] },
                          then: { medium: { $add: [{ $ifNull: ['$$value.medium', 0] }, 1] } }
                        },
                        {
                          case: { $eq: ['$$this.difficulty', 'hard'] },
                          then: { hard: { $add: [{ $ifNull: ['$$value.hard', 0] }, 1] } }
                        }
                      ],
                      default: '$$value'
                    }
                  }
                ]
              }
            }
          }
        }
      }
    ]);
  }

  // Thống kê theo thời gian
  static async getTimeBasedStats(interval, startDate, endDate) {
    const matchStage = this._buildDateMatchStage(startDate, endDate);

    const timeFormat = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $dateToString: { format: '%Y-%U', date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
      year: { $dateToString: { format: '%Y', date: '$createdAt' } }
    };

    return await Exam.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: timeFormat[interval],
          examCount: { $sum: 1 },
          totalRevenue: { $sum: '$price' },
          averageScore: { $avg: '$stats.averageScore' },
          totalAttempts: { $sum: '$stats.totalAttempts' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  // Helper method để tạo match stage cho thời gian
  static _buildDateMatchStage(startDate, endDate) {
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    return matchStage;
  }

  static async getPaymentHistory(page = 1, limit = 10, status) {
    const filter = {};
    if (status) {
      if (status === 'completed') filter.status = 'completed';
      else filter.status = { $ne: 'completed' };
    }
    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('_id user totalAmount status paymentMethod createdAt');
    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = SystemAnalyticsService; 