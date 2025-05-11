const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Topic = require('../models/Topic');
const Tag = require('../models/Tag');
const QuizAttempt = require('../models/QuizAttempt');
const userPerformanceService = require('./userPerformanceService');

const examRecommendationService = {
  /**
   * Lấy đề xuất bài thi dựa trên hiệu suất người dùng
   * @param {string} userId - ID của người dùng
   * @param {number} limit - Số lượng đề thi muốn lấy (mặc định: 6)
   * @returns {Array} Danh sách đề thi được đề xuất
   */
  async getRecommendedExams(userId, limit = 6) {
    // Lấy thông tin về hiệu suất theo chủ đề của người dùng
    const topicPerformance = await userPerformanceService.getTopicPerformance(userId);
    
    // Nếu chưa có dữ liệu hiệu suất, trả về các đề thi phổ biến
    if (!topicPerformance.length) {
      return this.getPopularExams(limit);
    }
    
    // Xác định các chủ đề cần cải thiện (có điểm thấp)
    const lowPerformanceTopics = topicPerformance
      .filter(topic => topic.accuracy < 70)
      .map(topic => topic.topicId);
    
    // Nếu không có chủ đề cần cải thiện, lấy các chủ đề ít làm bài nhất
    const focusTopics = lowPerformanceTopics.length > 0 
      ? lowPerformanceTopics 
      : topicPerformance
          .sort((a, b) => a.totalQuestions - b.totalQuestions)
          .slice(0, 3)
          .map(topic => topic.topicId);
    
    // Lấy các bài thi đã làm của người dùng
    const attemptedExams = await QuizAttempt.find({ 
      user: userId 
    }).distinct('exam');
    
    // Tìm các đề thi khớp với chủ đề cần tập trung và chưa làm
    let recommendedExams = await Exam.find({
      isPublished: true,
      topics: { $in: focusTopics },
      _id: { $nin: attemptedExams }
    })
    .populate('topics', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
    
    // Nếu không đủ đề thi theo yêu cầu, bổ sung thêm đề thi người dùng chưa làm
    if (recommendedExams.length < limit) {
      const remainingCount = limit - recommendedExams.length;
      const existingIds = recommendedExams.map(exam => exam._id);
      
      const additionalExams = await Exam.find({
        isPublished: true,
        _id: { 
          $nin: [...attemptedExams, ...existingIds]
        }
      })
      .populate('topics', 'name')
      .sort({ createdAt: -1 })
      .limit(remainingCount);
      
      recommendedExams = [...recommendedExams, ...additionalExams];
    }
    
    // Thêm thông tin performance cho từng đề thi
    const enrichedRecommendations = recommendedExams.map(exam => {
      // Lấy danh sách chủ đề của đề thi
      const examTopics = exam.topics ? exam.topics.map(topic => {
        // Chuyển ObjectId thành string để so sánh
        const topicId = topic._id.toString();
        
        // Tìm thông tin hiệu suất của chủ đề
        const performance = topicPerformance.find(p => p.topicId === topicId);
        
        return {
          id: topicId,
          name: topic.name || 'Chủ đề không xác định',
          accuracy: performance ? performance.accuracy : null,
          needPractice: performance ? performance.accuracy < 70 : false
        };
      }) : [];
      
      // Tính tổng số chủ đề cần luyện tập
      const needPracticeCount = examTopics.filter(t => t.needPractice).length;
      
      // Tính relevance score (0-100) dựa trên mức độ phù hợp với nhu cầu học tập
      let relevanceScore = 0;
      if (examTopics.length > 0) {
        relevanceScore = Math.min(100, Math.round((needPracticeCount / examTopics.length) * 100));
      }
      
      // Trả về thông tin đề thi với dữ liệu bổ sung
      return {
        id: exam._id,
        title: exam.title,
        description: exam.description,
        difficulty: exam.difficulty,
        questionCount: exam.questionCount || 0,
        timeLimit: exam.timeLimit,
        topics: examTopics,
        relevanceScore: relevanceScore,
        recommended: relevanceScore >= 50
      };
    });
    
    // Sắp xếp theo relevance score giảm dần
    return enrichedRecommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  },
  
  /**
   * Lấy đề xuất bài thi dựa trên một chủ đề cụ thể
   * @param {string} userId - ID của người dùng
   * @param {string} topicId - ID của chủ đề
   * @param {number} limit - Số lượng đề thi muốn lấy (mặc định: 3)
   * @returns {Array} Danh sách đề thi được đề xuất
   */
  async getTopicBasedRecommendations(userId, topicId, limit = 3) {
    // Lấy các bài thi đã làm của người dùng
    const attemptedExams = await QuizAttempt.find({ 
      user: userId 
    }).distinct('exam');
    
    // Tìm các đề thi khớp với chủ đề và chưa làm
    const recommendedExams = await Exam.find({
      isPublished: true,
      topics: topicId,
      _id: { $nin: attemptedExams }
    })
    .populate('topics', 'name')
    .sort({ createdAt: -1 })
    .limit(limit);
    
    // Thêm thông tin bổ sung
    return recommendedExams.map(exam => ({
      id: exam._id,
      title: exam.title,
      description: exam.description,
      difficulty: exam.difficulty,
      questionCount: exam.questionCount || 0,
      timeLimit: exam.timeLimit,
      topics: exam.topics ? exam.topics.map(topic => ({
        id: topic._id,
        name: topic.name
      })) : []
    }));
  },
  
  /**
   * Lấy đề thi phổ biến
   * @param {number} limit - Số lượng đề thi muốn lấy
   * @returns {Array} Danh sách đề thi phổ biến
   */
  async getPopularExams(limit = 6) {
    // Lấy các đề thi có nhiều lượt làm nhất
    const popularExams = await Exam.find({
      isPublished: true
    })
    .populate('topics', 'name')
    .sort({ attemptCount: -1 })
    .limit(limit);
    
    return popularExams.map(exam => ({
      id: exam._id,
      title: exam.title,
      description: exam.description,
      difficulty: exam.difficulty,
      questionCount: exam.questionCount || 0,
      timeLimit: exam.timeLimit,
      topics: exam.topics ? exam.topics.map(topic => ({
        id: topic._id,
        name: topic.name
      })) : [],
      relevanceScore: 100, // Mặc định cao vì là phổ biến
      recommended: true
    }));
  },
  
  /**
   * Lấy đề xuất học tập toàn diện
   * @param {string} userId - ID của người dùng
   * @returns {Object} Thông tin đề xuất học tập
   */
  async getComprehensiveRecommendations(userId) {
    // Lấy thông tin hiệu suất người dùng
    const [
      topicPerformance,
      suggestedTopics
    ] = await Promise.all([
      userPerformanceService.getTopicPerformance(userId),
      userPerformanceService.getImprovementSuggestions(userId)
    ]);
    
    // Đề xuất bài thi dựa trên chủ đề cần cải thiện
    const topicRecommendations = [];
    
    // Nếu có gợi ý cải thiện, lấy đề thi cho từng chủ đề
    if (suggestedTopics.length > 0) {
      // Lấy tối đa 3 chủ đề cần cải thiện nhất
      const topicsToImprove = suggestedTopics.slice(0, 3);
      
      // Lấy đề xuất bài thi cho từng chủ đề
      for (const topic of topicsToImprove) {
        const exams = await this.getTopicBasedRecommendations(userId, topic.topicId, 2);
        
        topicRecommendations.push({
          topicId: topic.topicId,
          topicName: topic.name,
          accuracy: topic.accuracy,
          needPractice: true,
          exams: exams
        });
      }
    }
    
    // Nếu không đủ 3 chủ đề, bổ sung thêm các chủ đề khác
    if (topicRecommendations.length < 3 && topicPerformance.length > 0) {
      // Lấy các chủ đề còn lại chưa có trong đề xuất
      const existingTopicIds = topicRecommendations.map(rec => rec.topicId);
      const otherTopics = topicPerformance
        .filter(topic => !existingTopicIds.includes(topic.topicId))
        .sort((a, b) => a.totalQuestions - b.totalQuestions) // Ưu tiên chủ đề ít làm
        .slice(0, 3 - topicRecommendations.length);
      
      // Lấy đề xuất bài thi cho từng chủ đề
      for (const topic of otherTopics) {
        const exams = await this.getTopicBasedRecommendations(userId, topic.topicId, 2);
        
        topicRecommendations.push({
          topicId: topic.topicId,
          topicName: topic.name,
          accuracy: topic.accuracy,
          needPractice: topic.accuracy < 90, // Chủ đề cần luyện tập nếu accuracy < 90%
          exams: exams
        });
      }
    }
    
    // Nếu không có chủ đề nào, trả về gợi ý mặc định
    if (topicRecommendations.length === 0) {
      const popularExams = await this.getPopularExams(6);
      
      return {
        hasLearningData: false,
        completionRate: 0,
        topicRecommendations: [],
        generalRecommendations: popularExams
      };
    }
    
    // Tính toán tỉ lệ hoàn thành học tập
    let completionRate = 0;
    if (topicPerformance.length > 0) {
      const totalTopics = topicPerformance.length;
      const masteredTopics = topicPerformance.filter(topic => topic.accuracy >= 90).length;
      completionRate = Math.round((masteredTopics / totalTopics) * 100);
    }
    
    // Trả về kết quả
    return {
      hasLearningData: true,
      completionRate,
      topicRecommendations,
      // Bổ sung 3 đề thi phổ biến
      generalRecommendations: await this.getPopularExams(3)
    };
  }
};

module.exports = examRecommendationService; 