const quizAttemptService = require('../services/quizAttemptService');
const ApiResponse = require('../utils/apiResponse');
const QuizAttempt = require('../models/QuizAttempt');
const Topic = require('../models/Topic');

const quizAttemptController = {
  // Bắt đầu làm bài kiểm tra
  startQuiz: async (req, res) => {
    try {
      const { examId } = req.body;
      const userId = req.user._id;
      // console.log('[QuizAttempt][startQuiz] userId:', userId, 'examId:', examId, 'body:', req.body);
      const quizAttempt = await quizAttemptService.startQuizAttempt(userId, examId);
      
      // Lấy thông tin chi tiết để client có đầy đủ dữ liệu
      const detailedAttempt = await quizAttemptService.getQuizAttempt(quizAttempt._id, userId);
      // console.log('[QuizAttempt][startQuiz] result:', detailedAttempt?._id);
      
      return ApiResponse.success(
        res,
        detailedAttempt,
        'Quiz started successfully',
        201
      );
    } catch (error) {
      if (error.message === 'Exam not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      if (error.message.includes('not available')) {
        return ApiResponse.error(res, error.message, 400);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Lấy thông tin phiên làm bài đang diễn ra
  getQuizAttempt: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      console.log('[QuizAttempt][getQuizAttempt] userId:', userId, 'attemptId:', id, 'query:', req.query);
      const quizAttempt = await quizAttemptService.getQuizAttempt(id, userId);

      // Biến đổi dữ liệu để dễ sử dụng phía client
      let responseData = quizAttempt;
      
      if (quizAttempt.exam && quizAttempt.exam.questions) {
        const questionsWithDetail = [];
        
        // Map câu trả lời theo ID câu hỏi để dễ truy cập
        const answersMap = {};
        if (quizAttempt.answers && quizAttempt.answers.length > 0) {
          quizAttempt.answers.forEach(answer => {
            if (answer.question) {
              answersMap[answer.question._id.toString()] = answer;
            }
          });
        }
        
        // Lấy thông tin chi tiết cho mỗi câu hỏi
        for (const examQuestion of quizAttempt.exam.questions) {
          // Lấy ID câu hỏi
          const questionId = examQuestion.question._id ? 
            examQuestion.question._id.toString() : 
            examQuestion.question.toString();
          
          // Lấy chi tiết câu hỏi từ populate hoặc từ database nếu chưa có
          let questionDetail = examQuestion.question;
          
          // Nếu không có thông tin chi tiết (chỉ có ID), thì fetch từ database
          if (!questionDetail || typeof questionDetail === 'string' || !questionDetail.content) {
            try {
              const Question = require('../models/Question');
              questionDetail = await Question.findById(questionId).select('content options difficulty correctAnswer explanation');
            } catch (err) {
              console.error(`Không thể lấy thông tin câu hỏi ${questionId}:`, err);
            }
          }
          
          if (questionDetail && questionDetail.content) {
            // Thông tin câu trả lời của người dùng (nếu đã trả lời)
            const userAnswer = answersMap[questionId] ? answersMap[questionId].selectedAnswer : null;
            const isCorrect = answersMap[questionId] ? answersMap[questionId].isCorrect : false;
            
            const questionWithDetail = {
              questionId: questionId,
              order: examQuestion.order,
              points: examQuestion.points,
              content: questionDetail.content,
              options: questionDetail.options,
              difficulty: questionDetail.difficulty,
              answered: userAnswer !== null,
              userAnswer: userAnswer
            };
            
            // Chỉ trả về đáp án đúng và giải thích nếu bài đã hoàn thành
            if (quizAttempt.status === 'completed') {
              questionWithDetail.correctAnswer = questionDetail.correctAnswer;
              questionWithDetail.explanation = questionDetail.explanation;
              questionWithDetail.isCorrect = isCorrect;
            }
            
            questionsWithDetail.push(questionWithDetail);
          }
        }
        
        // Sắp xếp câu hỏi theo thứ tự
        questionsWithDetail.sort((a, b) => a.order - b.order);
        
        // Thêm thông tin điều hướng cho mỗi câu hỏi
        questionsWithDetail.forEach((q, index) => {
          q.hasPrev = index > 0;
          q.hasNext = index < questionsWithDetail.length - 1;
          q.prevOrder = index > 0 ? questionsWithDetail[index - 1].order : null;
          q.nextOrder = index < questionsWithDetail.length - 1 ? questionsWithDetail[index + 1].order : null;
        });
        
        // Tạo thông tin tổng quan về trạng thái câu hỏi
        const questionStatus = questionsWithDetail.map(q => ({
          order: q.order,
          questionId: q.questionId,
          answered: q.answered,
          userAnswer: q.userAnswer
        }));
        
        // Tạo đối tượng phản hồi với thông tin chi tiết
        responseData = {
          ...(quizAttempt.toObject ? quizAttempt.toObject() : quizAttempt),
          questionsWithDetail: questionsWithDetail,
          questionStatus: questionStatus,
          totalQuestions: questionsWithDetail.length,
          answeredCount: questionStatus.filter(q => q.answered).length
        };
      }
      
      console.log('[QuizAttempt][getQuizAttempt] result:', quizAttempt?._id);
      return ApiResponse.success(
        res,
        responseData,
        'Quiz attempt retrieved successfully'
      );
    } catch (error) {
      if (error.message === 'Quiz attempt not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      if (error.message.includes('permission')) {
        return ApiResponse.forbidden(res, error.message);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Lấy danh sách các lần làm bài của người dùng
  getUserQuizAttempts: async (req, res) => {
    try {
      const userId = req.user._id;
      console.log('[QuizAttempt][getUserQuizAttempts] userId:', userId, 'query:', req.query);
      const result = await quizAttemptService.getUserQuizAttempts(userId, req.query);
      console.log('[QuizAttempt][getUserQuizAttempts] result:', result?.quizAttempts?.length);
      
      return ApiResponse.paginated(
        res,
        result.quizAttempts,
        result.pagination,
        'Quiz attempts retrieved successfully'
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Gửi câu trả lời cho một câu hỏi
  submitAnswer: async (req, res) => {
    try {
      const { id } = req.params;
      const { questionId, answer } = req.body;
      const userId = req.user._id;
      console.log('[QuizAttempt][submitAnswer] userId:', userId, 'attemptId:', id, 'questionId:', questionId, 'answer:', answer);
      const result = await quizAttemptService.submitAnswer(id, userId, questionId, answer);
      
      // Bổ sung thông tin về câu hỏi kế tiếp để client có thể chuyển sang câu hỏi tiếp theo
      try {
        // Lấy thông tin chi tiết về quizAttempt để biết câu hỏi tiếp theo
        const quizAttempt = await quizAttemptService.getQuizAttempt(id, userId);
        if (quizAttempt.exam && quizAttempt.exam.questions) {
          // Tìm câu hỏi hiện tại theo questionId
          const currentQuestionIndex = quizAttempt.exam.questions.findIndex(
            q => q.question._id.toString() === questionId || q.question.toString() === questionId
          );
          
          if (currentQuestionIndex >= 0 && currentQuestionIndex < quizAttempt.exam.questions.length - 1) {
            // Lấy thông tin câu hỏi kế tiếp
            const nextQuestion = quizAttempt.exam.questions[currentQuestionIndex + 1];
            result.nextQuestionId = nextQuestion.question._id ? 
              nextQuestion.question._id.toString() : nextQuestion.question.toString();
            result.nextQuestionOrder = nextQuestion.order;
          }
        }
      } catch (err) {
        // Không làm gì nếu có lỗi khi lấy thông tin câu hỏi kế tiếp
        console.log('Không thể lấy thông tin câu hỏi kế tiếp:', err.message);
      }
      
      console.log('[QuizAttempt][submitAnswer] result:', result);
      return ApiResponse.success(
        res,
        result,
        'Answer submitted successfully'
      );
    } catch (error) {
      if (error.message === 'Quiz attempt not found' || error.message === 'Question not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      if (error.message.includes('permission')) {
        return ApiResponse.forbidden(res, error.message);
      }
      
      if (error.message.includes('no longer in progress')) {
        return ApiResponse.error(res, error.message, 400);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Kết thúc làm bài
  completeQuiz: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      console.log('[QuizAttempt][completeQuiz] userId:', userId, 'attemptId:', id);
      const result = await quizAttemptService.completeQuizAttempt(id, userId);
      console.log('[QuizAttempt][completeQuiz] result:', result);
      
      // Kiểm tra xem người dùng có nộp bài sớm không
      let message = 'Quiz completed successfully';
      if (!result.autoCompleted) {
        // Lấy thông tin thêm để kiểm tra xem có nộp sớm không
        const quizAttempt = await QuizAttempt.findById(id).populate('exam', 'timeLimit');
        const isEarlySubmission = await quizAttemptService.shouldHideDetailedResults(quizAttempt);
        
        if (isEarlySubmission) {
          message = 'Quiz completed successfully. Detailed results will be available after the time limit expires.';
          result.isDetailedResultsHidden = true;
        }
      }
      
      return ApiResponse.success(
        res,
        result,
        message
      );
    } catch (error) {
      if (error.message === 'Quiz attempt not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      if (error.message.includes('permission')) {
        return ApiResponse.forbidden(res, error.message);
      }
      
      if (error.message.includes('already completed')) {
        return ApiResponse.error(res, error.message, 400);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Lấy kết quả chi tiết của một lần làm bài
  getQuizResult: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      // Lấy kết quả đã build sẵn từ service
      const quizAttempt = await quizAttemptService.getQuizAttemptResult(id, userId);
      
      // Trả về nguyên trạng, không tự build lại nữa!
      return ApiResponse.success(
        res,
        quizAttempt,
        'Quiz result retrieved successfully'
      );
    } catch (error) {
      if (error.message === 'Quiz attempt not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      if (error.message.includes('permission')) {
        return ApiResponse.forbidden(res, error.message);
      }
      
      if (error.message.includes('not been completed')) {
        return ApiResponse.error(res, error.message, 400);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Thêm đánh giá về bài kiểm tra
  addFeedback: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const quizAttempt = await quizAttemptService.addFeedback(id, userId, req.body);
      
      return ApiResponse.success(
        res,
        { success: true },
        'Feedback added successfully'
      );
    } catch (error) {
      if (error.message === 'Quiz attempt not found') {
        return ApiResponse.notFound(res, error.message);
      }
      
      if (error.message.includes('permission')) {
        return ApiResponse.forbidden(res, error.message);
      }
      
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Lấy kết quả tổng quan của một lần làm bài
  getQuizSummary: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id ? req.user._id.toString() : req.user._id; // Ép về string
      const summary = await quizAttemptService.getQuizAttemptSummary(id, userId);
      return ApiResponse.success(res, summary, 'Quiz summary retrieved successfully');
    } catch (error) {
      if (error.message === 'Quiz attempt not found') {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('permission')) {
        return ApiResponse.forbidden(res, error.message);
      }
      return ApiResponse.error(res, error.message);
    }
  },
  
  // Tổng quan lịch sử làm bài của user
  getUserQuizSummary: async (req, res) => {
    try {
      const userId = req.user._id;
      const QuizAttempt = require('../models/QuizAttempt');
      const Topic = require('../models/Topic');
      // Lấy tham số timeRange (số ngày), mặc định là toàn bộ lịch sử nếu không truyền
      const { timeRange } = req.query;
      const filter = { user: userId, status: 'completed' };
      if (timeRange) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(timeRange));
        filter.endTime = { $gte: startDate };
      }
      // Lấy tất cả các lần làm bài đã hoàn thành trong khoảng thời gian
      const attempts = await QuizAttempt.find(filter).populate({ path: 'exam', select: 'topic' });
      const totalAttempts = attempts.length;
      const averageScore = totalAttempts > 0 ? (attempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts) : 0;
      const countAbove80 = attempts.filter(a => a.score >= 80).length;
      const countBelow50 = attempts.filter(a => a.score < 50).length;
      const totalQuestions = attempts.reduce((sum, a) => sum + (a.answers ? a.answers.length : 0), 0);
      const correctAnswers = attempts.reduce((sum, a) => sum + (a.correctAnswers || 0), 0);
      const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
      const bestScore = attempts.reduce((max, a) => a.score > max ? a.score : max, 0);
      // Đếm số topic đã học
      const topicSet = new Set();
      attempts.forEach(a => {
        if (a.exam && a.exam.topic) topicSet.add(a.exam.topic.toString());
      });
      const topicCount = topicSet.size;
      const totalTopics = await Topic.countDocuments();
      return res.json({
        success: true,
        summary: {
          totalAttempts,
          averageScore: Math.round(averageScore * 10) / 10,
          countAbove80,
          countBelow50,
          totalQuestions,
          correctAnswers,
          totalTimeSpent,
          bestScore,
          topicStats: { learned: topicCount, total: totalTopics }
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  // API: Lấy danh sách lịch sử làm bài của người dùng (dạng đơn giản)
  getUserQuizHistory: async (req, res) => {
    try {
      const userId = req.user._id;
      const QuizAttempt = require("../models/QuizAttempt");
      const Exam = require("../models/Exam");
      const Topic = require("../models/Topic");

      // Lấy tất cả các lần làm bài đã hoàn thành
      const attempts = await QuizAttempt.find({ user: userId, status: "completed" })
        .populate({
          path: "exam",
          select: "title name topic questions",
          populate: { path: "topic", select: "name" }
        })
        .sort({ endTime: -1 });

      // Map dữ liệu về đúng định dạng yêu cầu
      const history = attempts.map((a, idx) => ({
        id: a._id,
        quizId: a.exam ? a.exam._id : null,
        quizName: a.exam ? (a.exam.name || a.exam.title || "") : "",
        correctAnswers: a.correctAnswers || 0,
        totalQuestions: a.exam && a.exam.questions ? a.exam.questions.length : 0,
        score: a.score,
        timeTaken: a.timeSpent || 0,
        dateTime: a.endTime,
        topic: a.exam && a.exam.topic && a.exam.topic.name ? a.exam.topic.name : "",
      }));

      return res.json({ success: true, history });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  
};

module.exports = quizAttemptController; 