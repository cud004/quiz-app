const mongoose = require('mongoose');
const QuizAttempt = require('../models/QuizAttempt');
const Topic = require('../models/Topic');
const Exam = require('../models/Exam');
const Tag = require('../models/Tag');

const learningAnalyticsService = {
  /**
   * Lấy thống kê học tập
   */
  async getAnalytics(userId, options) {
    const { type = 'overall', timeRange = 30 } = options;
    
    switch(type) {
      case 'overall':
        return this.getOverallStats(userId);
      case 'topic':
        return this.getTopicStats(userId);
      case 'progress':
        return this.getLearningProgress(userId, timeRange);
      case 'all':
        return this.getAllStats(userId, timeRange);
      default:
        throw new Error('Invalid analytics type');
    }
  },

  // Các phương thức private
  async getOverallStats(userId) {
    // Lấy tất cả lần làm bài đã hoàn thành
    const completedAttempts = await QuizAttempt.find({ 
      user: userId,
      status: 'completed'
    }).populate('exam', 'title topic');
    
    // Nếu không có lần làm bài nào
    if (completedAttempts.length === 0) {
      const totalTopics = await Topic.countDocuments();
      return {
        totalAttempts: 0,
        totalExams: 0, // Số đề kiểm tra đã làm (unique)
        averageScore: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracy: 0,
        totalTimeSpent: 0,
        recentScores: [],
        countAbove80: 0,
        countBelow50: 0,
        bestScore: 0,
        topicStats: { learned: 0, total: totalTopics }
      };
    }
    
    // Tính toán thống kê
    let totalScore = 0;
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalTimeSpent = 0;
    let bestScore = 0;
    let countAbove80 = 0;
    let countBelow50 = 0;
    const topicSet = new Set();
    const examSet = new Set();
    
    // Lấy 5 lần làm bài gần nhất
    const recentAttempts = [...completedAttempts]
      .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
      .slice(0, 5);
    
    const recentScores = recentAttempts.map(attempt => ({
      attemptId: attempt._id,
      examTitle: attempt.exam ? attempt.exam.title : 'Không có tiêu đề',
      score: attempt.score,
      date: attempt.endTime
    }));
    
    // Tính tổng các chỉ số
    completedAttempts.forEach(attempt => {
      totalScore += attempt.score || 0;
      totalCorrect += attempt.correctAnswers || 0;
      totalIncorrect += attempt.wrongAnswers || 0;
      totalTimeSpent += attempt.timeSpent || 0;
      if (attempt.score >= 80) countAbove80++;
      if (attempt.score < 50) countBelow50++;
      if (attempt.score > bestScore) bestScore = attempt.score;
      if (attempt.exam && attempt.exam.topic) topicSet.add(attempt.exam.topic.toString());
      if (attempt.exam) examSet.add(attempt.exam._id.toString());
    });
    
    // Tính tổng số câu hỏi từ số câu đúng và sai
    totalQuestions = totalCorrect + totalIncorrect;
    
    // Tính các chỉ số trung bình
    const averageScore = completedAttempts.length > 0 
      ? totalScore / completedAttempts.length 
      : 0;
    
    const accuracy = totalQuestions > 0 
      ? (totalCorrect / totalQuestions) * 100 
      : 0;
    
    const totalTopics = await Topic.countDocuments();
    
    return {
      totalAttempts: completedAttempts.length,
      totalExams: examSet.size, // Số đề kiểm tra đã làm (unique)
      averageScore,
      totalQuestions,
      correctAnswers: totalCorrect,
      incorrectAnswers: totalIncorrect,
      accuracy,
      totalTimeSpent,
      recentScores,
      countAbove80,
      countBelow50,
      bestScore,
      topicStats: { learned: topicSet.size, total: totalTopics }
    };
  },

  async getTopicStats(userId) {
    // Lấy tất cả lần làm bài đã hoàn thành
    const completedAttempts = await QuizAttempt.find({ 
      user: userId,
      status: 'completed'
    }).populate({
      path: 'exam',
      select: 'title topic',
      populate: {
        path: 'topic',
        select: 'name'
      }
    });
    
    // Nếu không có lần làm bài nào
    if (completedAttempts.length === 0) {
      return [];
    }
    
    // Tạo map để lưu thống kê theo topic
    const topicStats = new Map();
    
    // Duyệt qua từng lần làm bài
    completedAttempts.forEach(attempt => {
      if (attempt.exam && attempt.exam.topic) {
        const topic = attempt.exam.topic;
        const topicId = topic._id.toString();
        
        // Khởi tạo thống kê cho topic nếu chưa có
        if (!topicStats.has(topicId)) {
          topicStats.set(topicId, {
            topicId,
            name: topic.name,
            totalQuestions: 0,
            correctAnswers: 0,
            accuracy: 0,
            totalAttempts: 0,
            scores: [],
            maxScore: 0
          });
        }
        
        // Cập nhật thống kê
        const stats = topicStats.get(topicId);
        const score = attempt.score || 0;
        stats.scores.push(score);
        if (score > stats.maxScore) stats.maxScore = score;
        stats.totalQuestions += attempt.totalQuestions || 0;
        stats.correctAnswers += attempt.correctAnswers || 0;
        stats.totalAttempts += 1;
        stats.accuracy = (stats.totalQuestions > 0) ? (stats.correctAnswers / stats.totalQuestions) * 100 : 0;
      }
    });
    
    // Chuyển map thành array và bổ sung trường mới
    return Array.from(topicStats.values()).map(stat => ({
      topicId: stat.topicId,
      name: stat.name,
      totalQuestions: stat.totalQuestions,
      correctAnswers: stat.correctAnswers,
      accuracy: stat.accuracy,
      totalAttempts: stat.totalAttempts,
      averageScore: stat.scores.length > 0 ? (stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length) : 0,
      maxScore: stat.maxScore
    }));
  },

  async getLearningProgress(userId, days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Lấy tất cả lần làm bài trong khoảng thời gian
    const attempts = await QuizAttempt.find({
      user: userId,
      status: 'completed',
      endTime: { $gte: startDate }
    }).sort('endTime');
    
    // Nếu không có lần làm bài nào
    if (attempts.length === 0) {
      return {
        days: days,
        data: []
      };
    }
    
    // Tạo map để lưu thống kê theo ngày
    const dailyStats = new Map();
    
    // Khởi tạo thống kê cho tất cả các ngày
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      dailyStats.set(dateStr, {
        date: dateStr,
        attempts: 0,
        averageScore: 0, // Cách cũ: số câu đúng / tổng số câu hỏi
        totalQuestions: 0,
        correctAnswers: 0,
        scores: [], // Dùng để tính averageScoreByScore
        averageScoreByScore: 0 // Trung bình điểm số các lần làm bài trong ngày
      });
    }
    
    // Cập nhật thống kê từ các lần làm bài
    attempts.forEach(attempt => {
      const dateStr = new Date(attempt.endTime).toISOString().split('T')[0];
      
      if (dailyStats.has(dateStr)) {
        const stats = dailyStats.get(dateStr);
        stats.attempts += 1;
        stats.totalQuestions += attempt.totalQuestions || 0;
        stats.correctAnswers += attempt.correctAnswers || 0;
        stats.scores.push(attempt.score || 0);
      }
    });
    
    // Tính lại averageScore (cách cũ) và averageScoreByScore (cách mới)
    dailyStats.forEach(stats => {
      stats.averageScore = stats.totalQuestions > 0 ? (stats.correctAnswers / stats.totalQuestions) * 100 : 0;
      stats.averageScoreByScore = stats.scores.length > 0 ? (stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) : 0;
      delete stats.scores;
    });
    
    return {
      days: days,
      data: Array.from(dailyStats.values())
    };
  },

  async getAllStats(userId, days) {
    // Lấy tất cả các thống kê song song để tối ưu hiệu suất
    const [
      overallStats,
      topicStats,
      learningProgress
    ] = await Promise.all([
      this.getOverallStats(userId),
      this.getTopicStats(userId),
      this.getLearningProgress(userId, days)
    ]);
    
    return {
      overall: overallStats,
      topics: topicStats,
      progress: learningProgress
    };
  }
};

module.exports = learningAnalyticsService; 