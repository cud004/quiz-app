const mongoose = require('mongoose');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const QuizAttempt = require('../models/QuizAttempt');
const Payment = require('../models/Payments');
const Topic = require('../models/Topic');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const AILog = require('../models/AILog');

const analyticsService = {
  /**
   * Lấy dữ liệu analytics gần nhất theo kỳ hạn
   * @param {string} period - Kỳ hạn (daily, weekly, monthly)
   * @returns {Object} Dữ liệu analytics
   */
  async getLatestAnalytics(period = 'daily') {
    // Kiểm tra kỳ hạn hợp lệ
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      throw new Error('Kỳ hạn không hợp lệ. Các giá trị hợp lệ: daily, weekly, monthly');
    }
    
    // Lấy dữ liệu analytics gần nhất theo kỳ hạn
    const latestAnalytics = await Analytics.findOne({ period })
      .sort({ date: -1 })
      .limit(1);
    
    // Nếu không có dữ liệu, tạo mới
    if (!latestAnalytics) {
      const newAnalytics = await this.generateAnalytics(period);
      return newAnalytics;
    }
    
    return latestAnalytics;
  },
  
  /**
   * Lấy lịch sử analytics theo kỳ hạn
   * @param {string} period - Kỳ hạn (daily, weekly, monthly)
   * @param {number} limit - Số lượng bản ghi (mặc định: 10)
   * @returns {Array} Danh sách dữ liệu analytics
   */
  async getAnalyticsHistory(period = 'daily', limit = 10) {
    // Kiểm tra kỳ hạn hợp lệ
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      throw new Error('Kỳ hạn không hợp lệ. Các giá trị hợp lệ: daily, weekly, monthly');
    }
    
    // Lấy lịch sử analytics
    const analyticsHistory = await Analytics.find({ period })
      .sort({ date: -1 })
      .limit(limit);
    
    return analyticsHistory;
  },
  
  /**
   * Sinh dữ liệu analytics theo kỳ hạn
   * @param {string} period - Kỳ hạn (daily, weekly, monthly)
   * @returns {Object} Dữ liệu analytics mới
   */
  async generateAnalytics(period = 'daily') {
    let startDate, endDate;
    const now = new Date();
    
    // Xác định khoảng thời gian theo kỳ hạn
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = now;
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        endDate = now;
        break;
      default:
        throw new Error('Kỳ hạn không hợp lệ');
    }
    
    // Thu thập dữ liệu
    const [
      usersData,
      examsData,
      questionsData,
      quizAttemptsData,
      revenueData,
      topicsData,
      systemPerformanceData
    ] = await Promise.all([
      this.collectUsersData(startDate, endDate),
      this.collectExamsData(startDate, endDate),
      this.collectQuestionsData(startDate, endDate),
      this.collectQuizAttemptsData(startDate, endDate),
      this.collectRevenueData(startDate, endDate),
      this.collectTopicsData(startDate, endDate),
      this.collectSystemPerformanceData(startDate, endDate)
    ]);
    
    // Tạo dữ liệu analytics mới
    const analyticsData = {
      date: endDate,
      period,
      users: usersData,
      exams: examsData,
      questions: questionsData,
      quizAttempts: quizAttemptsData,
      revenue: revenueData,
      topics: topicsData,
      systemPerformance: systemPerformanceData
    };
    
    // Lưu và trả về dữ liệu
    try {
      // Kiểm tra nếu đã tồn tại
      const existingAnalytics = await Analytics.findOne({
        period,
        date: {
          $gte: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()),
          $lt: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1)
        }
      });
      
      if (existingAnalytics) {
        // Cập nhật
        Object.assign(existingAnalytics, analyticsData);
        await existingAnalytics.save();
        return existingAnalytics;
      } else {
        // Tạo mới
        const newAnalytics = await Analytics.create(analyticsData);
        return newAnalytics;
      }
    } catch (error) {
      throw new Error(`Lỗi khi lưu dữ liệu analytics: ${error.message}`);
    }
  },
  
  /**
   * Thu thập dữ liệu người dùng
   * @param {Date} startDate - Ngày bắt đầu
   * @param {Date} endDate - Ngày kết thúc
   * @returns {Object} Dữ liệu người dùng
   */
  async collectUsersData(startDate, endDate) {
    // Tổng số người dùng
    const total = await User.countDocuments({
      'deleted.isDeleted': false
    });
    
    // Người dùng hoạt động trong khoảng thời gian
    const active = await User.countDocuments({
      lastActive: { $gte: startDate, $lte: endDate },
      'deleted.isDeleted': false
    });
    
    // Người dùng mới trong khoảng thời gian
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
      'deleted.isDeleted': false
    });
    
    // Người dùng theo vai trò
    const usersByRole = await User.aggregate([
      {
        $match: {
          'deleted.isDeleted': false
        }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const byRole = {
      user: 0,
      admin: 0
    };
    
    usersByRole.forEach(item => {
      if (item._id in byRole) {
        byRole[item._id] = item.count;
      }
    });
    
    // Người dùng theo trạng thái
    const usersByStatus = await User.aggregate([
      {
        $match: {
          'deleted.isDeleted': false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const byStatus = {
      active: 0,
      inactive: 0,
      suspended: 0,
      banned: 0
    };
    
    usersByStatus.forEach(item => {
      if (item._id in byStatus) {
        byStatus[item._id] = item.count;
      }
    });
    
    return {
      total,
      active,
      new: newUsers,
      byRole,
      byStatus
    };
  },
  
  /**
   * Thu thập dữ liệu đề thi
   * @param {Date} startDate - Ngày bắt đầu
   * @param {Date} endDate - Ngày kết thúc
   * @returns {Object} Dữ liệu đề thi
   */
  async collectExamsData(startDate, endDate) {
    // Tổng số đề thi
    const total = await Exam.countDocuments();
    
    // Đề thi đã xuất bản
    const published = await Exam.countDocuments({ isPublished: true });
    
    // Đề thi mới trong khoảng thời gian
    const newExams = await Exam.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Đề thi theo độ khó
    const examsByDifficulty = await Exam.aggregate([
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const byDifficulty = {
      easy: 0,
      medium: 0,
      hard: 0
    };
    
    examsByDifficulty.forEach(item => {
      if (item._id in byDifficulty) {
        byDifficulty[item._id] = item.count;
      }
    });
    
    // Không có trường `type` trong model Exam, sử dụng stub data
    const byType = {
      practice: published,
      midterm: 0,
      final: 0,
      custom: 0
    };
    
    // Đề thi phổ biến nhất
    const mostPopular = await Exam.find({
      isPublished: true
    })
    .sort({ attemptCount: -1 })
    .limit(5)
    .select('_id title attemptCount');
    
    const mostPopularData = mostPopular.map(exam => ({
      exam: exam._id,
      title: exam.title,
      attempts: exam.attemptCount || 0
    }));
    
    return {
      total,
      published,
      new: newExams,
      byDifficulty,
      byType,
      mostPopular: mostPopularData
    };
  },
  
  /**
   * Thu thập dữ liệu câu hỏi
   * @param {Date} startDate - Ngày bắt đầu
   * @param {Date} endDate - Ngày kết thúc
   * @returns {Object} Dữ liệu câu hỏi
   */
  async collectQuestionsData(startDate, endDate) {
    // Tổng số câu hỏi
    const total = await Question.countDocuments();
    
    // Câu hỏi mới trong khoảng thời gian
    const newQuestions = await Question.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Câu hỏi theo độ khó
    const questionsByDifficulty = await Question.aggregate([
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const byDifficulty = {
      easy: 0,
      medium: 0,
      hard: 0
    };
    
    questionsByDifficulty.forEach(item => {
      if (item._id in byDifficulty) {
        byDifficulty[item._id] = item.count;
      }
    });
    
    // Câu hỏi khó nhất
    const mostDifficult = await Question.find({
      'stats.totalAttempts': { $gt: 5 }
    })
    .sort({ 'stats.correctRate': 1 })
    .limit(5)
    .select('_id content stats.correctRate');
    
    const mostDifficultData = mostDifficult.map(question => ({
      question: question._id,
      content: question.content,
      correctRate: question.stats?.correctRate || 0
    }));
    
    return {
      total,
      new: newQuestions,
      byDifficulty,
      mostDifficult: mostDifficultData
    };
  },
  
  /**
   * Thu thập dữ liệu lần làm bài
   * @param {Date} startDate - Ngày bắt đầu
   * @param {Date} endDate - Ngày kết thúc
   * @returns {Object} Dữ liệu lần làm bài
   */
  async collectQuizAttemptsData(startDate, endDate) {
    // Tổng số lần làm bài trong khoảng thời gian
    const total = await QuizAttempt.countDocuments({
      startTime: { $gte: startDate, $lte: endDate }
    });
    
    // Lần làm bài đã hoàn thành
    const completed = await QuizAttempt.countDocuments({
      startTime: { $gte: startDate, $lte: endDate },
      status: 'completed'
    });
    
    // Lần làm bài bỏ dở
    const abandoned = await QuizAttempt.countDocuments({
      startTime: { $gte: startDate, $lte: endDate },
      status: 'abandoned'
    });
    
    // Điểm trung bình
    const scoreData = await QuizAttempt.aggregate([
      {
        $match: {
          startTime: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$score' },
          averageTimeSpent: { $avg: '$timeSpent' }
        }
      }
    ]);
    
    const averageScore = scoreData.length > 0 ? scoreData[0].averageScore || 0 : 0;
    const averageTimeSpent = scoreData.length > 0 ? scoreData[0].averageTimeSpent || 0 : 0;
    
    return {
      total,
      completed,
      abandoned,
      averageScore,
      averageTimeSpent
    };
  },
  
  /**
   * Thu thập dữ liệu doanh thu
   * @param {Date} startDate - Ngày bắt đầu
   * @param {Date} endDate - Ngày kết thúc
   * @returns {Object} Dữ liệu doanh thu
   */
  async collectRevenueData(startDate, endDate) {
    // Tổng doanh thu trong khoảng thời gian
    const revenueData = await Payment.aggregate([
      {
        $match: {
          transactionTime: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    const total = revenueData.length > 0 ? revenueData[0].total || 0 : 0;
    
    // Doanh thu theo gói đăng ký
    const revenueByPackage = await Payment.aggregate([
      {
        $match: {
          transactionTime: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $lookup: {
          from: 'subscriptionpackages',
          localField: 'subscription.package',
          foreignField: '_id',
          as: 'packageInfo'
        }
      },
      {
        $unwind: {
          path: '$packageInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$subscription.package',
          name: { $first: '$packageInfo.name' },
          amount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Định dạng kết quả
    const byPackage = revenueByPackage.map(item => ({
      package: item._id,
      name: item.name || 'Unknown',
      amount: item.amount,
      count: item.count
    }));
    
    // Doanh thu theo phương thức thanh toán
    const revenueByMethod = await Payment.aggregate([
      {
        $match: {
          transactionTime: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    const byPaymentMethod = {
      vnpay: 0,
      momo: 0
    };
    
    revenueByMethod.forEach(item => {
      if (item._id in byPaymentMethod) {
        byPaymentMethod[item._id] = item.amount;
      }
    });
    
    return {
      total,
      byPackage,
      byPaymentMethod
    };
  },
  
  /**
   * Thu thập dữ liệu chủ đề
   * @param {Date} startDate - Ngày bắt đầu
   * @param {Date} endDate - Ngày kết thúc
   * @returns {Object} Dữ liệu chủ đề
   */
  async collectTopicsData(startDate, endDate) {
    // Tổng số chủ đề
    const total = await Topic.countDocuments();
    
    // Chủ đề phổ biến nhất
    const mostPopular = await Topic.find()
      .sort({ 'performanceStats.totalAttempts': -1 })
      .limit(5)
      .select('_id name performanceStats.totalAttempts');
    
    const mostPopularData = mostPopular.map(topic => ({
      topic: topic._id,
      name: topic.name,
      attemptCount: topic.performanceStats?.totalAttempts || 0
    }));
    
    return {
      total,
      mostPopular: mostPopularData
    };
  },
  
  /**
   * Thu thập dữ liệu hiệu suất hệ thống
   * @param {Date} startDate - Ngày bắt đầu
   * @param {Date} endDate - Ngày kết thúc
   * @returns {Object} Dữ liệu hiệu suất hệ thống
   */
  async collectSystemPerformanceData(startDate, endDate) {
    // Số lượng yêu cầu AI
    const aiRequestCount = await AILog.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Thời gian phản hồi trung bình của AI
    const aiResponseTime = await AILog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'success'
        }
      },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingTime' }
        }
      }
    ]);
    
    const avgResponseTime = aiResponseTime.length > 0 ? aiResponseTime[0].avgProcessingTime || 0 : 0;
    
    // Tỷ lệ lỗi của AI
    const aiErrorRate = await AILog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          failed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    let errorRate = 0;
    if (aiErrorRate.length > 0 && aiErrorRate[0].total > 0) {
      errorRate = (aiErrorRate[0].failed / aiErrorRate[0].total) * 100;
    }
    
    // Số phiên hoạt động đồng thời tối đa (stub data - cần triển khai logic thực tế)
    const activeSessionsMax = 0;
    
    return {
      avgResponseTime,
      errorRate,
      activeSessionsMax,
      aiRequestCount
    };
  },
  
  /**
   * Lấy báo cáo tổng quan hệ thống
   * @returns {Object} Báo cáo tổng quan
   */
  async getSystemOverview() {
    // Thu thập dữ liệu tổng quan
    const [
      usersCount,
      examsCount,
      questionsCount,
      quizAttemptsCount,
      totalRevenue,
      topicsCount
    ] = await Promise.all([
      User.countDocuments({ 'deleted.isDeleted': false }),
      Exam.countDocuments(),
      Question.countDocuments(),
      QuizAttempt.countDocuments(),
      Payment.aggregate([
        {
          $match: { status: 'completed' }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]),
      Topic.countDocuments()
    ]);
    
    // Người dùng mới trong 7 ngày qua
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const newUsersCount = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      'deleted.isDeleted': false
    });
    
    // Các đề thi phổ biến nhất
    const popularExams = await Exam.find()
      .sort({ attemptCount: -1 })
      .limit(5)
      .select('title attemptCount');
    
    // Các chủ đề phổ biến nhất
    const popularTopics = await Topic.find()
      .sort({ 'performanceStats.totalAttempts': -1 })
      .limit(5)
      .select('name performanceStats.totalAttempts');
    
    return {
      users: {
        total: usersCount,
        newLast7Days: newUsersCount
      },
      exams: {
        total: examsCount,
        popular: popularExams.map(exam => ({
          title: exam.title,
          attempts: exam.attemptCount || 0
        }))
      },
      questions: {
        total: questionsCount
      },
      quizAttempts: {
        total: quizAttemptsCount
      },
      revenue: {
        total: totalRevenue.length > 0 ? totalRevenue[0].total : 0
      },
      topics: {
        total: topicsCount,
        popular: popularTopics.map(topic => ({
          name: topic.name,
          attempts: topic.performanceStats?.totalAttempts || 0
        }))
      }
    };
  },
  
  /**
   * Lập lịch cập nhật dữ liệu analytics định kỳ
   * (Lưu ý: Phương thức này nên được gọi bằng một công cụ lập lịch như cron)
   */
  async scheduleAnalyticsUpdate() {
    // Cập nhật dữ liệu analytics hàng ngày
    await this.generateAnalytics('daily');
    
    // Kiểm tra nếu là đầu tuần (Thứ Hai), cập nhật dữ liệu hàng tuần
    const today = new Date();
    if (today.getDay() === 1) { // 0 = Chủ Nhật, 1 = Thứ Hai
      await this.generateAnalytics('weekly');
    }
    
    // Kiểm tra nếu là ngày đầu tháng, cập nhật dữ liệu hàng tháng
    if (today.getDate() === 1) {
      await this.generateAnalytics('monthly');
    }
    
    return {
      success: true,
      message: 'Cập nhật dữ liệu analytics thành công'
    };
  }
};

module.exports = analyticsService; 