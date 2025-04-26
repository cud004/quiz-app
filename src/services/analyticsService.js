const mongoose = require('mongoose');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const Topic = require('../models/Topic');
const Question = require('../models/Question');
const Exam = require('../models/Exam');

/**
 * Phân tích điểm mạnh/yếu theo chủ đề cho một người dùng
 * @param {string} userId - ID của người dùng
 * @returns {Promise<Array>} - Mảng chứa thông tin điểm mạnh/yếu theo từng chủ đề
 */
exports.analyzeTopicStrengths = async (userId) => {
  // Kiểm tra ID hợp lệ
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  // Lấy tất cả các lần làm bài của người dùng
  const attempts = await QuizAttempt.find({ user: userId, completed: true })
    .populate({
      path: 'topicPerformance.topic',
      select: 'name description'
    });

  if (!attempts || attempts.length === 0) {
    return { topics: [], message: 'No quiz attempts found for this user' };
  }

  // Tổng hợp hiệu suất theo từng chủ đề
  const topicPerformance = {};
  
  attempts.forEach(attempt => {
    attempt.topicPerformance.forEach(performance => {
      const topicId = performance.topic._id.toString();
      
      if (!topicPerformance[topicId]) {
        topicPerformance[topicId] = {
          topic: {
            _id: performance.topic._id,
            name: performance.topic.name,
            description: performance.topic.description
          },
          correctCount: 0,
          totalCount: 0,
          attempts: 0
        };
      }
      
      topicPerformance[topicId].correctCount += performance.correctCount;
      topicPerformance[topicId].totalCount += performance.totalCount;
      topicPerformance[topicId].attempts += 1;
    });
  });

  // Chuyển đổi object thành array và tính toán tỷ lệ chính xác
  const topics = Object.values(topicPerformance).map(item => {
    const accuracy = item.totalCount > 0 ? (item.correctCount / item.totalCount) * 100 : 0;
    
    return {
      ...item,
      accuracy: parseFloat(accuracy.toFixed(2)),
      strength: accuracy >= 70 ? 'strong' : accuracy >= 40 ? 'medium' : 'weak'
    };
  });

  // Sắp xếp theo độ chính xác (từ thấp đến cao)
  topics.sort((a, b) => a.accuracy - b.accuracy);

  return { topics, totalAttempts: attempts.length };
};

/**
 * Lấy tiến độ học tập theo thời gian của người dùng
 * @param {string} userId - ID của người dùng
 * @param {string} timeRange - Khoảng thời gian ('week', 'month', 'year')
 * @returns {Promise<Object>} - Dữ liệu tiến độ học tập theo thời gian
 */
exports.getLearningProgress = async (userId, timeRange = 'month') => {
  // Kiểm tra ID hợp lệ
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  // Xác định khoảng thời gian
  const now = new Date();
  let startDate;
  
  switch (timeRange) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Lấy các lần làm bài trong khoảng thời gian
  const attempts = await QuizAttempt.find({
    user: userId,
    completed: true,
    createdAt: { $gte: startDate }
  }).sort({ createdAt: 1 });

  if (!attempts || attempts.length === 0) {
    return { 
      timeRange,
      data: [],
      message: `No quiz attempts found for this user in the last ${timeRange}` 
    };
  }

  // Tạo dữ liệu cho biểu đồ
  const progressData = {};
  const dateFormat = timeRange === 'week' ? 'day' : timeRange === 'month' ? 'day' : 'month';

  attempts.forEach(attempt => {
    const date = new Date(attempt.createdAt);
    let key;
    
    if (dateFormat === 'day') {
      key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    } else {
      key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    
    if (!progressData[key]) {
      progressData[key] = {
        date: key,
        attempts: 0,
        score: 0,
        totalQuestions: 0,
        correctAnswers: 0
      };
    }
    
    progressData[key].attempts += 1;
    progressData[key].score += attempt.score;
    progressData[key].totalQuestions += attempt.totalQuestions;
    
    // Tính tổng số câu trả lời đúng
    attempt.answers.forEach(answer => {
      if (answer.isCorrect) {
        progressData[key].correctAnswers += 1;
      }
    });
  });

  // Chuyển đổi object thành array và tính toán tỷ lệ chính xác
  const data = Object.values(progressData).map(item => {
    const averageScore = item.attempts > 0 ? item.score / item.attempts : 0;
    const accuracy = item.totalQuestions > 0 ? (item.correctAnswers / item.totalQuestions) * 100 : 0;
    
    return {
      ...item,
      averageScore: parseFloat(averageScore.toFixed(2)),
      accuracy: parseFloat(accuracy.toFixed(2))
    };
  });

  return { timeRange, data };
};

/**
 * Lấy thống kê tổng quan cho dashboard admin
 * @param {string} timeRange - Khoảng thời gian ('week', 'month', 'year', 'all')
 * @returns {Promise<Object>} - Dữ liệu thống kê tổng quan
 */
exports.getDashboardStats = async (timeRange = 'month') => {
  // Xác định khoảng thời gian
  const now = new Date();
  let startDate;
  let dateQuery = {};
  
  if (timeRange !== 'all') {
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    dateQuery = { createdAt: { $gte: startDate } };
  }

  // Thực hiện các truy vấn song song
  const [
    totalUsers,
    activeUsers,
    totalExams,
    totalQuestions,
    totalAttempts,
    recentAttempts
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', isActive: true, ...dateQuery }),
    Exam.countDocuments({ isActive: true }),
    Question.countDocuments({ isActive: true }),
    QuizAttempt.countDocuments({ completed: true, ...dateQuery }),
    QuizAttempt.find({ completed: true, ...dateQuery })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', 'name email')
      .populate('exam', 'title')
  ]);

  // Tính toán tỷ lệ hoàn thành
  const completionRates = {};
  const userAttempts = {};
  
  recentAttempts.forEach(attempt => {
    const userId = attempt.user._id.toString();
    
    if (!userAttempts[userId]) {
      userAttempts[userId] = {
        completed: 0,
        total: 0
      };
    }
    
    userAttempts[userId].total += 1;
    if (attempt.completed) {
      userAttempts[userId].completed += 1;
    }
  });
  
  Object.values(userAttempts).forEach(stats => {
    const rate = Math.floor((stats.completed / stats.total) * 100);
    const rateKey = rate >= 90 ? '90-100%' :
                   rate >= 70 ? '70-89%' :
                   rate >= 50 ? '50-69%' :
                   rate >= 30 ? '30-49%' :
                   '0-29%';
    
    if (!completionRates[rateKey]) {
      completionRates[rateKey] = 0;
    }
    
    completionRates[rateKey] += 1;
  });

  // Phân tích phân phối điểm
  const scoreDistribution = {
    '0-20%': 0,
    '21-40%': 0,
    '41-60%': 0,
    '61-80%': 0,
    '81-100%': 0
  };
  
  recentAttempts.forEach(attempt => {
    const scorePercentage = (attempt.score / attempt.totalQuestions) * 100;
    
    if (scorePercentage <= 20) {
      scoreDistribution['0-20%'] += 1;
    } else if (scorePercentage <= 40) {
      scoreDistribution['21-40%'] += 1;
    } else if (scorePercentage <= 60) {
      scoreDistribution['41-60%'] += 1;
    } else if (scorePercentage <= 80) {
      scoreDistribution['61-80%'] += 1;
    } else {
      scoreDistribution['81-100%'] += 1;
    }
  });

  return {
    timeRange,
    totalUsers,
    activeUsers,
    totalExams,
    totalQuestions,
    totalAttempts,
    completionRates,
    scoreDistribution,
    recentAttempts: recentAttempts.slice(0, 5) // Chỉ trả về 5 lần làm bài gần nhất
  };
};

/**
 * Lấy thống kê chi tiết cho một đề thi
 * @param {string} examId - ID của đề thi
 * @returns {Promise<Object>} - Dữ liệu thống kê chi tiết
 */
exports.getExamStatistics = async (examId) => {
  // Kiểm tra ID hợp lệ
  if (!mongoose.Types.ObjectId.isValid(examId)) {
    throw new Error('Invalid exam ID');
  }

  // Lấy thông tin đề thi
  const exam = await Exam.findById(examId)
    .populate('questions', 'content options')
    .populate('topics', 'name');
  
  if (!exam) {
    throw new Error('Exam not found');
  }

  // Lấy tất cả các lần làm đề này
  const attempts = await QuizAttempt.find({ exam: examId, completed: true })
    .populate('user', 'name email');

  if (!attempts || attempts.length === 0) {
    return {
      exam,
      attemptCount: 0,
      message: 'No attempts found for this exam'
    };
  }

  // Tính điểm trung bình
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const averageScore = parseFloat((totalScore / attempts.length).toFixed(2));
  
  // Phân phối điểm
  const scoreDistribution = {
    '0-2': 0,
    '3-5': 0,
    '6-8': 0,
    '9-10': 0
  };
  
  attempts.forEach(attempt => {
    const normalizedScore = (attempt.score / attempt.totalQuestions) * 10;
    
    if (normalizedScore <= 2) {
      scoreDistribution['0-2'] += 1;
    } else if (normalizedScore <= 5) {
      scoreDistribution['3-5'] += 1;
    } else if (normalizedScore <= 8) {
      scoreDistribution['6-8'] += 1;
    } else {
      scoreDistribution['9-10'] += 1;
    }
  });
  
  // Phân tích câu hỏi sai nhiều nhất
  const questionStats = {};
  
  attempts.forEach(attempt => {
    attempt.answers.forEach(answer => {
      const questionId = answer.question.toString();
      
      if (!questionStats[questionId]) {
        questionStats[questionId] = {
          questionId,
          correctCount: 0,
          totalCount: 0
        };
      }
      
      questionStats[questionId].totalCount += 1;
      if (answer.isCorrect) {
        questionStats[questionId].correctCount += 1;
      }
    });
  });
  
  // Chuyển đổi object thành array và tính toán tỷ lệ chính xác
  const questionsAnalysis = Object.values(questionStats).map(item => {
    const accuracy = item.totalCount > 0 ? (item.correctCount / item.totalCount) * 100 : 0;
    
    return {
      ...item,
      accuracy: parseFloat(accuracy.toFixed(2))
    };
  });
  
  // Sắp xếp theo độ chính xác (từ thấp đến cao)
  questionsAnalysis.sort((a, b) => a.accuracy - b.accuracy);
  
  // Lấy thông tin chi tiết của 5 câu hỏi sai nhiều nhất
  const mostMissedQuestions = [];
  
  for (let i = 0; i < Math.min(5, questionsAnalysis.length); i++) {
    const questionStat = questionsAnalysis[i];
    const question = await Question.findById(questionStat.questionId)
      .select('content options explanation topic')
      .populate('topic', 'name');
    
    if (question) {
      mostMissedQuestions.push({
        ...questionStat,
        question
      });
    }
  }

  return {
    exam,
    attemptCount: attempts.length,
    averageScore,
    scoreDistribution,
    mostMissedQuestions
  };
};

/**
 * Lấy thống kê theo thời gian
 * @param {string} timeRange - Khoảng thời gian ('week', 'month', 'year')
 * @returns {Promise<Object>} - Dữ liệu thống kê theo thời gian
 */
exports.getTimelineStats = async (timeRange = 'month') => {
  // Xác định khoảng thời gian
  const now = new Date();
  let startDate;
  let groupFormat;
  
  switch (timeRange) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      groupFormat = '%Y-%m-%d';
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      groupFormat = '%Y-%m-%d';
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      groupFormat = '%Y-%m';
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      groupFormat = '%Y-%m-%d';
  }

  // Lấy số lượt làm bài theo thời gian
  const attemptsByDate = await QuizAttempt.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        completed: true
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
        count: { $sum: 1 },
        averageScore: { $avg: { $divide: ['$score', '$totalQuestions'] } }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Lấy số lượng người dùng mới theo thời gian
  const newUsersByDate = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        role: 'student'
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Kết hợp dữ liệu
  const timelineData = {};
  
  attemptsByDate.forEach(item => {
    timelineData[item._id] = {
      date: item._id,
      attempts: item.count,
      averageScore: parseFloat((item.averageScore * 100).toFixed(2)),
      newUsers: 0
    };
  });
  
  newUsersByDate.forEach(item => {
    if (!timelineData[item._id]) {
      timelineData[item._id] = {
        date: item._id,
        attempts: 0,
        averageScore: 0,
        newUsers: item.count
      };
    } else {
      timelineData[item._id].newUsers = item.count;
    }
  });

  // Chuyển đổi object thành array
  const data = Object.values(timelineData).sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  return { timeRange, data };
};
