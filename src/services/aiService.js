const mongoose = require('mongoose');
const AILog = require('../models/AILog');
const Question = require('../models/Question');
const QuizAttempt = require('../models/QuizAttempt');
const Topic = require('../models/Topic');
const Exam = require('../models/Exam');
const User = require('../models/User');
const analyticsService = require('./analyticsService');

/**
 * Giải thích lý do sai cho một câu hỏi
 * @param {string} questionId - ID của câu hỏi
 * @param {string} userId - ID của người dùng (không bắt buộc)
 * @returns {Promise<Object>} - Giải thích chi tiết
 */
exports.explainQuestion = async (questionId, userId = null) => {
  // Kiểm tra ID hợp lệ
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    throw new Error('Invalid question ID');
  }

  const startTime = Date.now();

  // Lấy thông tin câu hỏi
  const question = await Question.findById(questionId)
    .populate('topic', 'name');

  if (!question) {
    throw new Error('Question not found');
  }

  // Tạo giải thích chi tiết
  let explanation = question.explanation;

  // Nếu câu hỏi không có giải thích sẵn, tạo giải thích tự động
  if (!explanation || explanation.trim() === '') {
    const correctOption = question.options.find(option => option.isCorrect);
    const correctAnswer = correctOption ? correctOption.text : 'Unknown';

    explanation = `Đáp án đúng là: "${correctAnswer}"\n\n`;
    explanation += `Giải thích: Câu hỏi này thuộc chủ đề ${question.topic.name}. `;
    explanation += `Khi trả lời câu hỏi này, bạn cần lưu ý các điểm sau:\n`;
    explanation += `1. Xem xét kỹ nội dung câu hỏi: "${question.content}"\n`;
    explanation += `2. Phân tích từng phương án trả lời\n`;
    explanation += `3. Loại trừ các phương án không chính xác\n\n`;
    explanation += `Đáp án "${correctAnswer}" là chính xác vì đây là kiến thức cơ bản trong chủ đề ${question.topic.name}.`;
  }

  // Ghi log nếu có userId
  if (userId) {
    const processingTime = Date.now() - startTime;
    
    await AILog.create({
      user: userId,
      type: 'explanation',
      input: { questionId },
      output: { explanation },
      processingTime
    });
  }

  return {
    question,
    explanation
  };
};

/**
 * Gợi ý lộ trình học tập thông minh cho người dùng
 * @param {string} userId - ID của người dùng
 * @returns {Promise<Object>} - Lộ trình học tập được gợi ý
 */
exports.suggestLearningPath = async (userId) => {
  // Kiểm tra ID hợp lệ
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }

  const startTime = Date.now();

  // Lấy phân tích điểm mạnh/yếu theo chủ đề
  const { topics } = await analyticsService.analyzeTopicStrengths(userId);

  if (!topics || topics.length === 0) {
    throw new Error('No topic data available for this user');
  }

  // Xác định các chủ đề yếu (accuracy < 50%)
  const weakTopics = topics.filter(topic => topic.accuracy < 50);
  
  // Xác định các chủ đề trung bình (50% <= accuracy < 70%)
  const mediumTopics = topics.filter(topic => topic.accuracy >= 50 && topic.accuracy < 70);
  
  // Xác định các chủ đề mạnh (accuracy >= 70%)
  const strongTopics = topics.filter(topic => topic.accuracy >= 70);

  // Tạo lộ trình học tập
  const learningPath = [];
  
  // 1. Ưu tiên các chủ đề yếu
  for (const topic of weakTopics) {
    const recommendedExams = await Exam.find({
      topics: topic.topic._id,
      isActive: true,
      difficulty: { $in: ['easy', 'medium'] }
    })
    .limit(2)
    .select('title description difficulty');
    
    learningPath.push({
      topic: topic.topic,
      status: 'weak',
      accuracy: topic.accuracy,
      priority: 'high',
      recommendedExams
    });
  }
  
  // 2. Thêm các chủ đề trung bình
  for (const topic of mediumTopics) {
    const recommendedExams = await Exam.find({
      topics: topic.topic._id,
      isActive: true,
      difficulty: 'medium'
    })
    .limit(1)
    .select('title description difficulty');
    
    learningPath.push({
      topic: topic.topic,
      status: 'medium',
      accuracy: topic.accuracy,
      priority: 'medium',
      recommendedExams
    });
  }
  
  // 3. Thêm các chủ đề mạnh (để duy trì)
  for (const topic of strongTopics) {
    const recommendedExams = await Exam.find({
      topics: topic.topic._id,
      isActive: true,
      difficulty: 'hard'
    })
    .limit(1)
    .select('title description difficulty');
    
    learningPath.push({
      topic: topic.topic,
      status: 'strong',
      accuracy: topic.accuracy,
      priority: 'low',
      recommendedExams
    });
  }

  // Sắp xếp lộ trình theo độ ưu tiên
  learningPath.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (a.priority !== 'high' && b.priority === 'high') return 1;
    if (a.priority === 'medium' && b.priority === 'low') return -1;
    if (a.priority === 'low' && b.priority === 'medium') return 1;
    return a.accuracy - b.accuracy;
  });

  // Ghi log
  const processingTime = Date.now() - startTime;
  
  await AILog.create({
    user: userId,
    type: 'learning_path',
    input: { userId },
    output: { 
      weakTopicsCount: weakTopics.length,
      mediumTopicsCount: mediumTopics.length,
      strongTopicsCount: strongTopics.length,
      pathLength: learningPath.length
    },
    processingTime
  });

  return {
    weakTopics: weakTopics.length,
    mediumTopics: mediumTopics.length,
    strongTopics: strongTopics.length,
    learningPath
  };
};

/**
 * Tạo đề thi thông minh dựa trên mức độ, chủ đề và tỷ lệ điểm yếu
 * @param {Object} params - Tham số để tạo đề thi
 * @param {string} params.title - Tiêu đề đề thi
 * @param {string} params.description - Mô tả đề thi
 * @param {string} params.userId - ID của người dùng (để phân tích điểm yếu)
 * @param {number} params.questionCount - Số lượng câu hỏi
 * @param {string} params.difficulty - Độ khó ('easy', 'medium', 'hard', 'adaptive')
 * @param {number} params.weaknessRatio - Tỷ lệ câu hỏi từ chủ đề yếu (0-100)
 * @param {Array<string>} params.topics - Danh sách ID chủ đề (không bắt buộc)
 * @returns {Promise<Object>} - Đề thi được tạo
 */
exports.generateSmartExam = async ({ title, description, userId, questionCount, difficulty, weaknessRatio, topics }) => {
  // Kiểm tra các tham số
  if (!title || !description) {
    throw new Error('Title and description are required');
  }
  
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Valid user ID is required');
  }
  
  if (!questionCount || questionCount < 5) {
    throw new Error('Question count must be at least 5');
  }
  
  if (weaknessRatio < 0 || weaknessRatio > 100) {
    throw new Error('Weakness ratio must be between 0 and 100');
  }

  const startTime = Date.now();

  // Lấy phân tích điểm mạnh/yếu theo chủ đề
  const { topics: userTopics } = await analyticsService.analyzeTopicStrengths(userId);
  
  // Nếu không có dữ liệu chủ đề, sử dụng các chủ đề được chỉ định
  let targetTopics = [];
  let weakTopicIds = [];
  let strongTopicIds = [];
  
  if (!userTopics || userTopics.length === 0) {
    if (!topics || topics.length === 0) {
      throw new Error('No topics specified and no user topic data available');
    }
    
    // Sử dụng các chủ đề được chỉ định
    targetTopics = topics;
  } else {
    // Phân loại chủ đề theo độ mạnh/yếu
    weakTopicIds = userTopics
      .filter(topic => topic.accuracy < 50)
      .map(topic => topic.topic._id.toString());
    
    strongTopicIds = userTopics
      .filter(topic => topic.accuracy >= 50)
      .map(topic => topic.topic._id.toString());
    
    // Nếu có chủ đề được chỉ định, lọc theo chủ đề đó
    if (topics && topics.length > 0) {
      weakTopicIds = weakTopicIds.filter(id => topics.includes(id));
      strongTopicIds = strongTopicIds.filter(id => topics.includes(id));
    }
    
    targetTopics = [...weakTopicIds, ...strongTopicIds];
  }
  
  if (targetTopics.length === 0) {
    throw new Error('No valid topics available for exam generation');
  }

  // Tính toán số lượng câu hỏi từ chủ đề yếu và mạnh
  const weakQuestionCount = Math.round((weaknessRatio / 100) * questionCount);
  const strongQuestionCount = questionCount - weakQuestionCount;
  
  // Xác định độ khó của câu hỏi
  let questionDifficulty;
  
  if (difficulty === 'adaptive') {
    // Độ khó thích ứng: 40% dễ, 40% trung bình, 20% khó
    questionDifficulty = {
      easy: Math.ceil(questionCount * 0.4),
      medium: Math.ceil(questionCount * 0.4),
      hard: questionCount - Math.ceil(questionCount * 0.4) - Math.ceil(questionCount * 0.4)
    };
  } else {
    // Độ khó cố định
    questionDifficulty = {
      [difficulty]: questionCount
    };
  }

  // Lấy câu hỏi từ chủ đề yếu
  let weakQuestions = [];
  
  if (weakQuestionCount > 0 && weakTopicIds.length > 0) {
    for (const diff in questionDifficulty) {
      if (questionDifficulty[diff] === 0) continue;
      
      const diffCount = Math.ceil((weakQuestionCount / questionCount) * questionDifficulty[diff]);
      
      const questions = await Question.aggregate([
        { 
          $match: { 
            topic: { $in: weakTopicIds.map(id => new mongoose.Types.ObjectId(id)) },
            difficulty: diff,
            isActive: true
          } 
        },
        { $sample: { size: diffCount } }
      ]);
      
      weakQuestions = [...weakQuestions, ...questions];
    }
  }

  // Lấy câu hỏi từ chủ đề mạnh
  let strongQuestions = [];
  
  if (strongQuestionCount > 0) {
    for (const diff in questionDifficulty) {
      if (questionDifficulty[diff] === 0) continue;
      
      const diffCount = Math.ceil((strongQuestionCount / questionCount) * questionDifficulty[diff]);
      
      const questions = await Question.aggregate([
        { 
          $match: { 
            topic: { $in: strongTopicIds.map(id => new mongoose.Types.ObjectId(id)) },
            difficulty: diff,
            isActive: true
          } 
        },
        { $sample: { size: diffCount } }
      ]);
      
      strongQuestions = [...strongQuestions, ...questions];
    }
  }

  // Kết hợp câu hỏi
  let allQuestions = [...weakQuestions, ...strongQuestions];
  
  // Nếu không đủ câu hỏi, lấy thêm từ bất kỳ chủ đề nào
  if (allQuestions.length < questionCount) {
    const remainingCount = questionCount - allQuestions.length;
    const existingIds = allQuestions.map(q => q._id);
    
    const additionalQuestions = await Question.aggregate([
      { 
        $match: { 
          _id: { $nin: existingIds },
          topic: { $in: targetTopics.map(id => new mongoose.Types.ObjectId(id)) },
          isActive: true
        } 
      },
      { $sample: { size: remainingCount } }
    ]);
    
    allQuestions = [...allQuestions, ...additionalQuestions];
  }

  // Nếu vẫn không đủ câu hỏi, trả về lỗi
  if (allQuestions.length < questionCount) {
    throw new Error(`Not enough questions available. Found ${allQuestions.length}, but ${questionCount} required.`);
  }

  // Tạo đề thi
  const exam = new Exam({
    title,
    description,
    questions: allQuestions.map(q => q._id),
    topics: [...new Set(allQuestions.map(q => q.topic))],
    timeLimit: Math.ceil(questionCount * 1.5), // 1.5 phút cho mỗi câu hỏi
    difficulty: difficulty === 'adaptive' ? 'mixed' : difficulty,
    examType: 'custom',
    status: 'published',
    isActive: true
  });
  
  await exam.save();

  // Ghi log
  const processingTime = Date.now() - startTime;
  
  await AILog.create({
    user: userId,
    type: 'recommendation',
    input: { 
      userId,
      questionCount,
      difficulty,
      weaknessRatio,
      topics
    },
    output: { 
      examId: exam._id,
      weakQuestionsCount: weakQuestions.length,
      strongQuestionsCount: strongQuestions.length,
      totalQuestions: allQuestions.length
    },
    processingTime
  });

  // Trả về thông tin chi tiết của bài thi
  return await Exam.findById(exam._id).populate({
    path: 'questions',
    select: 'content options topic',
    populate: { path: 'topic', select: 'name' }
  });
};
