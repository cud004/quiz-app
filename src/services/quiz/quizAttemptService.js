const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const QuizAttempt = require('../../models/QuizAttempt');
const Exam = require('../../models/Exam');
const Question = require('../../models/Question');
const examService = require('../exam/examService');

const quizAttemptService = {
  // Bắt đầu làm bài kiểm tra
  async startQuizAttempt(userId, examId) {
    // Kiểm tra exam tồn tại
    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new Error('Exam not found');
    }
    
    // Kiểm tra exam đã được published chưa
    if (!exam.isPublished) {
      throw new Error('This exam is not available for attempts');
    }
    
    // Kiểm tra xem người dùng có đang làm bài thi này không
    const existingAttempt = await QuizAttempt.findOne({
      user: userId,
      exam: examId,
      status: 'in_progress'
    });
    
    if (existingAttempt) {
      return existingAttempt; // Trả về phiên làm bài đang diễn ra
    }
    
    // Khởi tạo một lần thử mới
    const quizAttempt = new QuizAttempt({
      user: userId,
      exam: examId,
      score: 0,
      startTime: new Date(),
      endTime: new Date(), // Sẽ cập nhật lại khi kết thúc
      timeSpent: 0,
      status: 'in_progress',
      answers: [],
      correctAnswers: 0,
      wrongAnswers: 0,
      skippedQuestions: 0,
      completed: false
    });
    
    await quizAttempt.save();
    
    // Cập nhật số lượt làm bài cho exam
    await examService.incrementAttemptCount(examId);
    
    return quizAttempt;
  },
  
  // Lấy thông tin phiên làm bài
  async getQuizAttempt(attemptId, userId) {
    const quizAttempt = await QuizAttempt.findById(attemptId)
      .populate('exam', 'title description timeLimit questions')
      .populate({
        path: 'answers.question',
        select: 'content options correctAnswer explanation',
      })
      .populate({
        path: 'exam.questions.question',
        select: 'content options difficulty correctAnswer explanation',
      });
    
    if (!quizAttempt) {
      throw new Error('Quiz attempt not found');
    }
    
    // Kiểm tra xem người dùng có quyền truy cập không
    if (quizAttempt.user.toString() !== userId.toString()) {
      throw new Error('You do not have permission to access this attempt');
    }
    
    // Kiểm tra thời gian làm bài
    if (quizAttempt.status === 'in_progress') {
      const isTimeExpired = await this.checkTimeLimit(quizAttempt);
      if (isTimeExpired) {
        // Nếu đã hết thời gian, tự động hoàn thành
        await this.completeQuizAttempt(attemptId, userId, true);
        // Lấy lại phiên làm bài đã cập nhật
        return await QuizAttempt.findById(attemptId)
          .populate('exam', 'title description timeLimit questions')
          .populate({
            path: 'answers.question',
            select: 'content options correctAnswer explanation',
          })
          .populate({
            path: 'exam.questions.question',
            select: 'content options difficulty correctAnswer explanation',
          });
      }
    }
    
    return quizAttempt;
  },
  
  // Lấy danh sách phiên làm bài của người dùng
  async getUserQuizAttempts(userId, query = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      examId
    } = query;
    
    const filter = { user: userId };
    
    if (status) {
      filter.status = status;
    }
    
    if (examId) {
      filter.exam = examId;
    }
    
    const quizAttempts = await QuizAttempt.find(filter)
      .populate('exam', 'title description')
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await QuizAttempt.countDocuments(filter);
    
    return {
      quizAttempts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },
  
  // Gửi câu trả lời
  async submitAnswer(attemptId, userId, questionId, answer) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const quizAttempt = await QuizAttempt.findById(attemptId).session(session);
      
      if (!quizAttempt) {
        throw new Error('Quiz attempt not found');
      }
      
      // Kiểm tra xem người dùng có quyền truy cập không
      if (quizAttempt.user.toString() !== userId.toString()) {
        throw new Error('You do not have permission to access this attempt');
      }
      
      // Kiểm tra trạng thái làm bài
      if (quizAttempt.status !== 'in_progress') {
        throw new Error('This quiz attempt is no longer in progress');
      }
      
      // Kiểm tra thời gian làm bài
      const isTimeExpired = await this.checkTimeLimit(quizAttempt);
      if (isTimeExpired) {
        // Hủy transaction
        await session.abortTransaction();
        session.endSession();
        
        // Tự động hoàn thành bài làm
        await this.completeQuizAttempt(attemptId, userId, true);
        throw new Error('Time limit has expired. Your quiz has been automatically completed.');
      }
      
      // Kiểm tra câu hỏi
      const question = await Question.findById(questionId).session(session);
      if (!question) {
        throw new Error('Question not found');
      }
      
      // Lấy thông tin đề thi để kiểm tra câu hỏi có thuộc đề thi không
      const exam = await Exam.findById(quizAttempt.exam).session(session);
      
      // Kiểm tra câu hỏi có thuộc đề thi không
      const isQuestionInExam = exam.questions.some(q => 
        q.question.toString() === questionId.toString()
      );
      
      if (!isQuestionInExam) {
        throw new Error('This question does not belong to the current exam');
      }
      
      // Kiểm tra câu trả lời đã tồn tại chưa
      const existingAnswerIndex = quizAttempt.answers.findIndex(
        a => a.question.toString() === questionId.toString()
      );
      
      const isCorrect = answer === question.correctAnswer;
      
      if (existingAnswerIndex >= 0) {
        // Cập nhật câu trả lời đã tồn tại
        quizAttempt.answers[existingAnswerIndex].selectedAnswer = answer;
        quizAttempt.answers[existingAnswerIndex].isCorrect = isCorrect;
      } else {
        // Thêm câu trả lời mới
        quizAttempt.answers.push({
          question: questionId,
          selectedAnswer: answer,
          isCorrect: isCorrect,
          timeSpent: 0 // Sẽ tính sau
        });
      }
      
      await quizAttempt.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      // Không trả về thông tin isCorrect, chỉ xác nhận đã nhận được câu trả lời
      return {
        success: true,
        questionId: questionId,
        answered: true
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },
  
  // Kiểm tra thời gian làm bài
  async checkTimeLimit(quizAttempt) {
    // Nếu đã hoàn thành hoặc bỏ dở, không cần kiểm tra thời gian
    if (quizAttempt.status !== 'in_progress') {
      return false;
    }
    
    // Lấy thông tin đề thi
    const exam = await Exam.findById(quizAttempt.exam);
    if (!exam) {
      return false;
    }
    
    const timeLimit = exam.timeLimit; // Số phút cho phép
    const startTime = new Date(quizAttempt.startTime);
    const now = new Date();
    
    // Tính thời gian đã làm (phút)
    const elapsedMinutes = (now - startTime) / (1000 * 60);
    
    // Kiểm tra đã vượt quá thời gian chưa
    return elapsedMinutes > timeLimit;
  },
  
  // Kết thúc làm bài
  async completeQuizAttempt(attemptId, userId, autoComplete = false) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const quizAttempt = await QuizAttempt.findById(attemptId)
        .populate('exam', 'questions totalPoints passingScore')
        .session(session);
      
      if (!quizAttempt) {
        throw new Error('Quiz attempt not found');
      }
      
      // Kiểm tra xem người dùng có quyền truy cập không
      if (quizAttempt.user.toString() !== userId.toString()) {
        throw new Error('You do not have permission to access this attempt');
      }
      
      // Kiểm tra trạng thái làm bài
      if (quizAttempt.status !== 'in_progress') {
        throw new Error('This quiz attempt is already completed');
      }
      
      // Cập nhật thời gian kết thúc
      quizAttempt.endTime = new Date();
      
      // Tính thời gian làm bài (đơn vị giây)
      quizAttempt.timeSpent = Math.floor(
        (quizAttempt.endTime - quizAttempt.startTime) / 1000
      );
      
      // Tính điểm và thống kê
      let totalPoints = 0;
      let earnedPoints = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let skippedCount = 0;
      
      // Lấy thông tin các câu hỏi từ đề thi
      const examQuestions = quizAttempt.exam.questions;
      
      // Tính tổng điểm tối đa
      totalPoints = examQuestions.reduce((total, q) => total + q.points, 0);
      
      // Tạo map câu hỏi -> điểm
      const questionPointsMap = {};
      examQuestions.forEach(q => {
        questionPointsMap[q.question.toString()] = q.points;
      });
      
      // Tính điểm đã đạt được và thống kê
      quizAttempt.answers.forEach(answer => {
        const questionId = answer.question.toString();
        const points = questionPointsMap[questionId] || 0;
        
        if (answer.isCorrect) {
          earnedPoints += points;
          correctCount++;
        } else {
          incorrectCount++;
        }
      });
      
      // Tính số câu bỏ qua
      skippedCount = examQuestions.length - quizAttempt.answers.length;
      
      // Cập nhật thông tin vào quizAttempt
      quizAttempt.score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
      quizAttempt.correctAnswers = correctCount;
      quizAttempt.wrongAnswers = incorrectCount;
      quizAttempt.skippedQuestions = skippedCount;
      quizAttempt.status = 'completed';
      quizAttempt.completed = true;
      
      // Cập nhật thông tin tổng kết
      quizAttempt.resultSummary = {
        correctCount,
        incorrectCount
      };
      
      await quizAttempt.save({ session });
      
      await session.commitTransaction();
      session.endSession();
      
      // Chuẩn bị kết quả trả về
      const result = {
        score: quizAttempt.score,
        totalPoints,
        earnedPoints,
        correctAnswers: correctCount,
        wrongAnswers: incorrectCount,
        skippedQuestions: skippedCount,
        timeSpent: quizAttempt.timeSpent,
        passed: quizAttempt.score >= quizAttempt.exam.passingScore,
        autoCompleted: autoComplete
      };
      
      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },
  
  // Lấy kết quả chi tiết của một lần làm bài
  async getQuizAttemptResult(attemptId, userId) {
    const quizAttempt = await QuizAttempt.findById(attemptId)
      .populate('exam', 'title description questions totalPoints passingScore timeLimit')
      .populate({
        path: 'answers.question',
        select: 'content options difficulty correctAnswer explanation'
      })
      .populate({
        path: 'exam.questions.question', 
        select: 'content options difficulty correctAnswer explanation' 
      });
    
    if (!quizAttempt) {
      throw new Error('Quiz attempt not found');
    }
    
    // Kiểm tra người dùng có quyền xem kết quả không
    if (quizAttempt.user.toString() !== userId.toString()) {
      throw new Error('You do not have permission to access this result');
    }
    
    // Nếu bài làm chưa hoàn thành thì kiểm tra xem có hết thời gian chưa
    if (quizAttempt.status === 'in_progress') {
      const isTimeExpired = await this.checkTimeLimit(quizAttempt);
      
      if (isTimeExpired) {
        // Tự động hoàn thành bài làm
        await this.completeQuizAttempt(attemptId, userId, true);
        // Lấy lại kết quả
        return await this.getQuizAttemptResult(attemptId, userId);
      } else {
        throw new Error('This quiz attempt has not been completed');
      }
    }
    
    // Kiểm tra xem có nộp bài sớm không và có nên ẩn đáp án không
    const shouldHideDetailedResults = this.shouldHideDetailedResults(quizAttempt);
    
    // Nếu nộp bài sớm, ẩn đáp án chi tiết
    if (shouldHideDetailedResults) {
      // Tạo bản sao kết quả nhưng ẩn đáp án đúng và giải thích
      const sanitizedResult = quizAttempt.toObject();
      
      // Ẩn correctAnswer và explanation
      if (sanitizedResult.answers && sanitizedResult.answers.length > 0) {
        sanitizedResult.answers.forEach(answer => {
          if (answer.question) {
            // Chỉ hiển thị đáp án đã chọn và cả 2 câu trả lời đúng sai
            delete answer.question.correctAnswer;
            delete answer.question.explanation;
          }
        });
      }
      
      // Thêm thông tin là kết quả đã được ẩn
      sanitizedResult.isDetailedResultsHidden = true;
      sanitizedResult.message = 'Detailed results are hidden until the time limit expires';
      
      return sanitizedResult;
    }
    
    // Trả về kết quả đầy đủ
    return quizAttempt;
  },
  
  // Kiểm tra xem có nên ẩn kết quả chi tiết không
  shouldHideDetailedResults(quizAttempt) {
    // Nếu nộp bài do hết thời gian (tự động hoàn thành), cho xem kết quả chi tiết
    if (quizAttempt.status === 'completed' && quizAttempt.autoCompleted) {
      return false;
    }
    
    const startTime = new Date(quizAttempt.startTime);
    const endTime = new Date(quizAttempt.endTime);
    const timeLimit = quizAttempt.exam.timeLimit; // Số phút cho phép
    
    // Chuyển đổi thành milliseconds
    const timeLimitMs = timeLimit * 60 * 1000;
    
    // Tính thời gian sử dụng
    const usedTime = endTime - startTime;
    
    // Nếu sử dụng ít hơn 80% thời gian được cấp
    return usedTime < (timeLimitMs * 0.8);
  },
  
  // Thêm đánh giá về bài kiểm tra
  async addFeedback(attemptId, userId, feedback) {
    const quizAttempt = await QuizAttempt.findById(attemptId);
    
    if (!quizAttempt) {
      throw new Error('Quiz attempt not found');
    }
    
    // Kiểm tra người dùng có quyền thêm đánh giá không
    if (quizAttempt.user.toString() !== userId.toString()) {
      throw new Error('You do not have permission to add feedback to this attempt');
    }
    
    // Kiểm tra bài làm đã hoàn thành chưa
    if (quizAttempt.status !== 'completed') {
      throw new Error('Cannot add feedback to an incomplete quiz attempt');
    }
    
    // Cập nhật đánh giá
    quizAttempt.feedback = feedback;
    
    await quizAttempt.save();
    
    return quizAttempt;
  }
};

module.exports = quizAttemptService; 