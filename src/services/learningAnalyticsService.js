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

  /**
   * Lấy đề xuất học tập
   */
  async getRecommendations(userId, options) {
    const { type = 'comprehensive', limit = 6, topicId } = options;
    
    switch(type) {
      case 'performance':
        return this.getPerformanceBasedRecommendations(userId, limit);
      case 'topic':
        if (!topicId) throw new Error('Topic ID is required');
        return this.getTopicBasedRecommendations(userId, topicId, limit);
      case 'popular':
        return this.getPopularRecommendations(limit);
      case 'comprehensive':
        return this.getComprehensiveRecommendations(userId);
      default:
        throw new Error('Invalid recommendation type');
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
            totalAttempts: 0
          });
        }
        
        // Cập nhật thống kê
        const stats = topicStats.get(topicId);
        stats.totalQuestions += attempt.totalQuestions || 0;
        stats.correctAnswers += attempt.correctAnswers || 0;
        stats.totalAttempts += 1;
        stats.accuracy = (stats.correctAnswers / stats.totalQuestions) * 100;
      }
    });
    
    // Chuyển map thành array và sắp xếp theo accuracy
    return Array.from(topicStats.values())
      .sort((a, b) => a.accuracy - b.accuracy);
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
        averageScore: 0,
        totalQuestions: 0,
        correctAnswers: 0
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
        stats.averageScore = (stats.correctAnswers / stats.totalQuestions) * 100;
      }
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
  },

  async getPerformanceBasedRecommendations(userId, limit = 6) {
    const topicStats = await this.getTopicStats(userId);
    
    // Nếu không có thống kê
    if (!topicStats.length) {
      return this.getPopularRecommendations(limit);
    }
    
    // Lấy các topic có hiệu suất thấp
    const lowPerformanceTopics = topicStats
      .filter(topic => topic.accuracy < 70)
      .slice(0, 3);
    
    // Nếu không có topic nào có hiệu suất thấp, lấy tất cả
    const focusTopics = lowPerformanceTopics.length > 0
      ? lowPerformanceTopics
      : topicStats;
    
    // Lấy các bài kiểm tra liên quan
    const exams = await Exam.find({
      topic: { $in: focusTopics.map(t => t.topicId) },
      isActive: true
    })
    .populate('topic', 'name')
    .limit(limit);
    
    return exams.map(exam => ({
      examId: exam._id,
      title: exam.title,
      topic: exam.topic ? {
        id: exam.topic._id,
        name: exam.topic.name
      } : null,
      difficulty: exam.difficulty,
      questionCount: exam.questionCount,
      timeLimit: exam.timeLimit,
      score: exam.score
    }));
  },

  async getTopicBasedRecommendations(userId, topicId, limit = 3) {
    const topicStats = await this.getTopicStats(userId);
    const performance = topicStats.find(p => p.topicId === topicId);
    
    // Lấy các bài kiểm tra của topic
    const exams = await Exam.find({
      topic: topicId,
      isActive: true
    })
    .populate('topic', 'name')
    .limit(limit);
    
    return exams.map(exam => ({
      examId: exam._id,
      title: exam.title,
      topic: exam.topic ? {
        id: exam.topic._id,
        name: exam.topic.name
      } : null,
      difficulty: exam.difficulty,
      questionCount: exam.questionCount,
      timeLimit: exam.timeLimit,
      score: exam.score,
      performance: performance ? {
        accuracy: performance.accuracy,
        totalAttempts: performance.totalAttempts
      } : null
    }));
  },

  async getPopularRecommendations(limit = 6) {
    const exams = await Exam.find({
      isActive: true
    })
    .populate('topic', 'name')
    .sort('-attemptCount')
    .limit(limit);
    
    return exams.map(exam => ({
      examId: exam._id,
      title: exam.title,
      topic: exam.topic ? {
        id: exam.topic._id,
        name: exam.topic.name
      } : null,
      difficulty: exam.difficulty,
      questionCount: exam.questionCount,
      timeLimit: exam.timeLimit,
      score: exam.score,
      attemptCount: exam.attemptCount
    }));
  },

  async getComprehensiveRecommendations(userId) {
    const topicStats = await this.getTopicStats(userId);
    
    // Nếu không có thống kê
    if (!topicStats.length) {
      return this.getPopularRecommendations(6);
    }
    
    // Lấy các topic cần cải thiện
    const topicsToImprove = topicStats
      .filter(topic => topic.accuracy < 70)
      .slice(0, 3);
    
    const recommendations = [];
    
    // Thêm đề xuất cho các topic cần cải thiện
    for (const topic of topicsToImprove) {
      const topicExams = await Exam.find({
        topic: topic.topicId,
        isActive: true
      })
      .populate('topic', 'name')
      .limit(2);
      
      recommendations.push(...topicExams.map(exam => ({
        examId: exam._id,
        title: exam.title,
        topic: exam.topic ? {
          id: exam.topic._id,
          name: exam.topic.name
        } : null,
        difficulty: exam.difficulty,
        questionCount: exam.questionCount,
        timeLimit: exam.timeLimit,
        score: exam.score,
        reason: 'Cần cải thiện'
      })));
    }
    
    // Nếu chưa đủ 6 đề xuất, thêm các topic khác
    if (recommendations.length < 6 && topicStats.length > 0) {
      const otherTopics = topicStats
        .filter(topic => topic.accuracy >= 70)
        .slice(0, 3);
      
      for (const topic of otherTopics) {
        const topicExams = await Exam.find({
          topic: topic.topicId,
          isActive: true
        })
        .populate('topic', 'name')
        .limit(2);
        
        recommendations.push(...topicExams.map(exam => ({
          examId: exam._id,
          title: exam.title,
          topic: exam.topic ? {
            id: exam.topic._id,
            name: exam.topic.name
          } : null,
          difficulty: exam.difficulty,
          questionCount: exam.questionCount,
          timeLimit: exam.timeLimit,
          score: exam.score,
          reason: 'Duy trì'
        })));
      }
    }
    
    return recommendations.slice(0, 6);
  }
};

module.exports = learningAnalyticsService; 