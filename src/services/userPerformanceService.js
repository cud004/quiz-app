const mongoose = require('mongoose');
const QuizAttempt = require('../models/QuizAttempt');
const Topic = require('../models/Topic');
const Question = require('../models/Question');

const userPerformanceService = {
  /**
   * Lấy thống kê hiệu suất tổng quan của người dùng
   * @param {string} userId - ID của người dùng
   * @returns {Object} Thống kê tổng quan
   */
  async getOverallStats(userId) {
    // Lấy tất cả lần làm bài đã hoàn thành
    const completedAttempts = await QuizAttempt.find({ 
      user: userId,
      status: 'completed'
    }).populate('exam', 'title');
    
    // Nếu không có lần làm bài nào
    if (completedAttempts.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracy: 0,
        totalTimeSpent: 0,
        recentScores: []
      };
    }
    
    // Tính toán thống kê
    let totalScore = 0;
    let totalQuestions = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalTimeSpent = 0;
    
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
    });
    
    // Tính tổng số câu hỏi từ số câu đúng và sai
    totalQuestions = totalCorrect + totalIncorrect;
    
    // Tính trung bình
    const averageScore = totalScore / completedAttempts.length;
    const accuracy = totalCorrect / (totalCorrect + totalIncorrect) * 100;
    
    return {
      totalAttempts: completedAttempts.length,
      averageScore: parseFloat(averageScore.toFixed(2)),
      totalQuestions,
      correctAnswers: totalCorrect,
      incorrectAnswers: totalIncorrect,
      accuracy: parseFloat(accuracy.toFixed(2)),
      totalTimeSpent,
      recentScores
    };
  },
  
  /**
   * Lấy thống kê theo từng chủ đề
   * @param {string} userId - ID của người dùng
   * @returns {Array} Danh sách thống kê theo chủ đề
   */
  async getTopicPerformance(userId) {
    // Lấy tất cả lần làm bài đã hoàn thành
    const completedAttempts = await QuizAttempt.find({ 
      user: userId,
      status: 'completed'
    }).populate({
      path: 'answers.question',
      select: 'content topics'
    });
    
    // Nhóm câu trả lời theo chủ đề
    const topicPerformance = {};
    
    // Duyệt qua tất cả lần làm bài
    for (const attempt of completedAttempts) {
      // Duyệt qua tất cả câu trả lời
      for (const answer of attempt.answers) {
        // Nếu không có thông tin câu hỏi, bỏ qua
        if (!answer.question || !answer.question.topics) continue;
        
        // Duyệt qua tất cả chủ đề của câu hỏi
        for (const topicId of answer.question.topics) {
          const topicIdStr = topicId.toString();
          
          // Nếu chưa có thông tin chủ đề, khởi tạo
          if (!topicPerformance[topicIdStr]) {
            topicPerformance[topicIdStr] = {
              topicId: topicIdStr,
              totalQuestions: 0,
              correctAnswers: 0,
              incorrectAnswers: 0,
              accuracy: 0
            };
          }
          
          // Cập nhật thống kê
          topicPerformance[topicIdStr].totalQuestions++;
          
          if (answer.isCorrect) {
            topicPerformance[topicIdStr].correctAnswers++;
          } else {
            topicPerformance[topicIdStr].incorrectAnswers++;
          }
        }
      }
    }
    
    // Tính toán accuracy và lấy thông tin chi tiết về chủ đề
    const topicIds = Object.keys(topicPerformance);
    const topics = await Topic.find({ _id: { $in: topicIds } });
    
    // Map chủ đề để thêm thông tin
    const topicMap = {};
    topics.forEach(topic => {
      topicMap[topic._id.toString()] = {
        name: topic.name,
        description: topic.description
      };
    });
    
    // Tạo mảng kết quả
    const result = Object.values(topicPerformance).map(topic => {
      // Tính accuracy
      topic.accuracy = parseFloat(((topic.correctAnswers / topic.totalQuestions) * 100).toFixed(2));
      
      // Thêm thông tin chủ đề
      if (topicMap[topic.topicId]) {
        topic.name = topicMap[topic.topicId].name;
        topic.description = topicMap[topic.topicId].description;
      } else {
        topic.name = 'Chủ đề không xác định';
        topic.description = '';
      }
      
      return topic;
    });
    
    // Sắp xếp theo số lượng câu hỏi giảm dần
    return result.sort((a, b) => b.totalQuestions - a.totalQuestions);
  },
  
  /**
   * Lấy đề xuất chủ đề cần cải thiện
   * @param {string} userId - ID của người dùng
   * @returns {Array} Danh sách chủ đề cần cải thiện
   */
  async getImprovementSuggestions(userId) {
    // Lấy thống kê theo chủ đề
    const topicPerformance = await this.getTopicPerformance(userId);
    
    if (topicPerformance.length === 0) {
      return [];
    }
    
    // Giai đoạn 1: Chủ đề có accuracy thấp (<70%) và ít nhất 3 câu hỏi
    let suggestedTopics = topicPerformance
      .filter(topic => topic.accuracy < 70 && topic.totalQuestions >= 3)
      .sort((a, b) => a.accuracy - b.accuracy);
    
    // Nếu không đủ 3 chủ đề được gợi ý
    if (suggestedTopics.length < 3) {
      // Giai đoạn 2: Thêm chủ đề có accuracy < 80% và ít nhất 2 câu hỏi
      const additionalTopics = topicPerformance
        .filter(topic => 
          topic.accuracy < 80 && 
          topic.totalQuestions >= 2 &&
          !suggestedTopics.some(t => t.topicId === topic.topicId)
        )
        .sort((a, b) => a.accuracy - b.accuracy);
      
      suggestedTopics = [...suggestedTopics, ...additionalTopics];
      
      // Giai đoạn 3: Nếu vẫn không đủ, thêm chủ đề có ít câu hỏi nhất
      if (suggestedTopics.length < 3) {
        const remainingTopics = topicPerformance
          .filter(topic => 
            !suggestedTopics.some(t => t.topicId === topic.topicId)
          )
          .sort((a, b) => a.totalQuestions - b.totalQuestions);
        
        suggestedTopics = [...suggestedTopics, ...remainingTopics];
      }
    }
    
    // Giới hạn kết quả trả về tối đa 5 chủ đề
    return suggestedTopics.slice(0, 5).map(topic => ({
      ...topic,
      improvementReason: this.getImprovementReason(topic)
    }));
  },
  
  /**
   * Xác định lý do cần cải thiện cho một chủ đề
   * @param {Object} topic - Thông tin hiệu suất của chủ đề
   * @returns {String} Lý do cần cải thiện
   */
  getImprovementReason(topic) {
    if (topic.accuracy < 50) {
      return 'Cần cải thiện đáng kể: Độ chính xác quá thấp';
    } else if (topic.accuracy < 70) {
      return 'Cần luyện tập thêm để nâng cao kỹ năng';
    } else if (topic.totalQuestions < 5) {
      return 'Cần làm thêm bài tập để đánh giá đầy đủ';
    } else {
      return 'Có thể cải thiện thêm để thành thạo';
    }
  },
  
  /**
   * Lấy tiến độ học tập theo thời gian
   * @param {string} userId - ID của người dùng
   * @param {number} days - Số ngày gần nhất (mặc định: 30)
   * @returns {Object} Dữ liệu tiến độ theo thời gian
   */
  async getLearningProgress(userId, days = 30) {
    // Tính ngày bắt đầu (ngày hiện tại - số ngày)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    // Lấy tất cả lần làm bài trong khoảng thời gian
    const attempts = await QuizAttempt.find({
      user: userId,
      endTime: { $gte: startDate }
    }).sort('endTime');
    
    // Tạo map ngày -> thống kê
    const dailyMap = {};
    
    // Khởi tạo dữ liệu cho tất cả các ngày
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      dailyMap[dateStr] = {
        date: dateStr,
        attempts: 0,
        averageScore: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        timeSpent: 0
      };
    }
    
    // Cập nhật dữ liệu từ các lần làm bài
    attempts.forEach(attempt => {
      const dateStr = new Date(attempt.endTime).toISOString().split('T')[0];
      
      // Nếu ngày không nằm trong khoảng thời gian, bỏ qua
      if (!dailyMap[dateStr]) return;
      
      const dailyStats = dailyMap[dateStr];
      
      // Cập nhật thống kê
      dailyStats.attempts++;
      dailyStats.totalQuestions += attempt.correctAnswers + attempt.wrongAnswers;
      dailyStats.correctAnswers += attempt.correctAnswers;
      dailyStats.incorrectAnswers += attempt.wrongAnswers;
      dailyStats.timeSpent += attempt.timeSpent;
      
      // Cập nhật điểm trung bình
      const totalScore = dailyStats.averageScore * (dailyStats.attempts - 1);
      dailyStats.averageScore = (totalScore + attempt.score) / dailyStats.attempts;
      dailyStats.averageScore = parseFloat(dailyStats.averageScore.toFixed(2));
    });
    
    // Chuyển đổi thành mảng để trả về
    return Object.values(dailyMap);
  }
};

module.exports = userPerformanceService; 