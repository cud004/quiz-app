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
        select: 'content options',
      })
      .populate({
        path: 'exam.questions.question',
        select: 'content options difficulty',
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
            select: 'content options',
          })
          .populate({
            path: 'exam.questions.question',
            select: 'content options difficulty',
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
        .populate('exam', 'questions totalPoints')
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
    try {
      // 1. Lấy thông tin lần thi và exam
      const quizAttempt = await QuizAttempt.findById(attemptId)
        .populate({
          path: 'exam',
          select: 'title description questions totalPoints timeLimit'
        })
        .lean();

      if (!quizAttempt) {
        throw new Error('Quiz attempt not found');
      }

      // 2. Kiểm tra quyền truy cập
      if (quizAttempt.user.toString() !== userId.toString()) {
        throw new Error('You do not have permission to access this result');
      }

      // 3. Lấy danh sách câu hỏi từ exam
      const examQuestions = quizAttempt.exam.questions || [];
      const questionIds = examQuestions.map(q => q.question);
      

      // 4. Lấy thông tin chi tiết của tất cả câu hỏi
      const questions = await Question.find(
        { _id: { $in: questionIds } }
      ).lean();
     

      // 5. Tạo map câu hỏi để dễ truy cập
      const questionsMap = {};
      questions.forEach(q => {
        questionsMap[q._id.toString()] = q;
      });
   

      // 6. Tạo map câu trả lời của user
      const answersMap = {};
      if (quizAttempt.answers && Array.isArray(quizAttempt.answers)) {
        quizAttempt.answers.forEach(answer => {
          if (answer.question) {
            answersMap[answer.question.toString()] = answer;
          }
        });
      }
    

      // 7. Xử lý từng câu hỏi trong exam (KHÔNG filter(Boolean) nữa)
      const questionsWithAnswers = examQuestions.map((examQuestion, index) => {
        const questionId = examQuestion.question.toString();
        const questionDetail = questionsMap[questionId];

        if (!questionDetail) {
          return {
            questionId,
            order: examQuestion.order ?? index,
            points: examQuestion.points ?? 1,
            content: '[Câu hỏi không tồn tại]',
            options: [],
            difficulty: null,
            userAnswer: null,
            correctAnswer: null,
            correctAnswerText: null,
            explanation: null,
            isCorrect: false,
            answered: false,
            status: 'not_found',
            hasPrev: index > 0,
            hasNext: index < examQuestions.length - 1,
            prevOrder: index > 0 ? index - 1 : null,
            nextOrder: index < examQuestions.length - 1 ? index + 1 : null
          };
        }

        const userAnswer = answersMap[questionId];
        const correctOption = questionDetail.options.find(
          opt => opt.label === questionDetail.correctAnswer
        );

        return {
          questionId,
          order: examQuestion.order ?? index,
          points: examQuestion.points ?? 1,
          content: questionDetail.content,
          options: questionDetail.options,
          difficulty: questionDetail.difficulty,
          userAnswer: userAnswer ? userAnswer.selectedAnswer : null,
          correctAnswer: questionDetail.correctAnswer,
          correctAnswerText: correctOption ? correctOption.text : null,
          explanation: questionDetail.explanation,
          isCorrect: userAnswer ? userAnswer.isCorrect : false,
          answered: !!userAnswer,
          status: !userAnswer ? 'not_answered' : (userAnswer.isCorrect ? 'correct' : 'incorrect'),
          hasPrev: index > 0,
          hasNext: index < examQuestions.length - 1,
          prevOrder: index > 0 ? index - 1 : null,
          nextOrder: index < examQuestions.length - 1 ? index + 1 : null
        };
      });
     

      // 8. Sắp xếp câu hỏi theo thứ tự
      questionsWithAnswers.sort((a, b) => a.order - b.order);

      // 9. Tạo trạng thái cho từng câu hỏi
      const questionStatus = questionsWithAnswers.map(q => ({
        order: q.order,
        questionId: q.questionId,
        answered: q.answered,
        userAnswer: q.userAnswer
      }));
    

      // 10. Tính toán điểm và thống kê
      const totalPoints = examQuestions.reduce((sum, q) => sum + (q.points ?? 1), 0);
      const earnedPoints = questionsWithAnswers.reduce((sum, q) =>
        sum + (q.isCorrect ? (q.points ?? 1) : 0), 0);

      // 11. Tạo response
      const response = {
        _id: quizAttempt._id,
        user: quizAttempt.user,
        exam: {
          _id: quizAttempt.exam._id,
          title: quizAttempt.exam.title,
          description: quizAttempt.exam.description,
          timeLimit: quizAttempt.exam.timeLimit,
          totalPoints: totalPoints
        },
        score: quizAttempt.score ?? 0,
        startTime: quizAttempt.startTime,
        endTime: quizAttempt.endTime,
        timeSpent: quizAttempt.timeSpent ?? 0,
        correctAnswers: quizAttempt.correctAnswers ?? 0,
        wrongAnswers: quizAttempt.wrongAnswers ?? 0,
        skippedQuestions: quizAttempt.skippedQuestions ?? examQuestions.length,
        status: quizAttempt.status ?? 'completed',
        autoCompleted: quizAttempt.autoCompleted ?? false,
        completed: quizAttempt.completed ?? false,
        reviewed: quizAttempt.reviewed ?? false,
        resultSummary: {
          totalPoints: totalPoints,
          earnedPoints: earnedPoints,
          correctCount: questionsWithAnswers.filter(q => q.isCorrect).length,
          incorrectCount: questionsWithAnswers.filter(q => q.answered && !q.isCorrect).length,
          skippedCount: questionsWithAnswers.filter(q => !q.answered).length
        },
        questionsWithAnswers,
        questionStatus,
        totalQuestions: questionsWithAnswers.length,
        answeredCount: questionsWithAnswers.filter(q => q.answered).length
      };
      
      return response;
    } catch (error) {
      console.error('Error in getQuizAttemptResult:', error);
      throw error;
    }
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
  },
  
  // Kiểm tra xem có nên ẩn kết quả chi tiết hay không
  async shouldHideDetailedResults(quizAttempt) {
    // Luôn hiển thị kết quả chi tiết
    return false;
  },
  
  async getQuizAttemptSummary(attemptId, userId) {
    // 1. Lấy thông tin lần thi và exam
    const quizAttempt = await QuizAttempt.findById(attemptId)
      .populate({
        path: 'exam',
        select: 'title description questions totalPoints timeLimit topic',
        populate: {
          path: 'questions.question',
          select: 'tags content',
          populate: [
            { path: 'tags', select: 'name' }
          ]
        }
      })
      .populate({
        path: 'answers.question',
        select: 'tags'
      })
      .populate({
        path: 'exam.topic',
        select: 'name'
      })
      .lean();

    if (!quizAttempt) {
      throw new Error('Quiz attempt not found');
    }
    if (
      quizAttempt.user.toString() !== userId.toString()
    ) {
      // Thêm log để debug nếu vẫn lỗi
      console.log('Permission check failed:', quizAttempt.user.toString(), userId.toString());
      throw new Error('You do not have permission to access this result');
    }

    // Tổng số câu, số câu đúng, sai
    const totalQuestions = quizAttempt.exam.questions.length;
    const correctAnswers = quizAttempt.correctAnswers || 0;
    const wrongAnswers = quizAttempt.wrongAnswers || 0;
    const timeSpent = quizAttempt.timeSpent || 0;
    const score = quizAttempt.score || 0;

    // Map câu trả lời theo questionId
    const answersMap = {};
    (quizAttempt.answers || []).forEach(ans => {
      if (ans.question) answersMap[ans.question.toString()] = ans;
    });

    // Phân tích theo tag
    const tagStats = {};
    for (const examQ of quizAttempt.exam.questions) {
      const q = examQ.question;
      const qId = q._id ? q._id.toString() : q.toString();
      const answer = answersMap[qId];
      const isCorrect = answer ? answer.isCorrect : false;
      // Tags
      if (q.tags && Array.isArray(q.tags)) {
        for (const tag of q.tags) {
          const tagId = tag._id ? tag._id.toString() : tag.toString();
          const tagName = tag.name || tagId;
          if (!tagStats[tagId]) tagStats[tagId] = { tagId, tagName, correct: 0, total: 0 };
          tagStats[tagId].total++;
          if (isCorrect) tagStats[tagId].correct++;
        }
      }
    }
    // Tính phần trăm
    const tagAnalysis = Object.values(tagStats).map(t => ({
      ...t,
      percent: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0
    }));

    // Phân tích theo topic (chỉ 1 topic của exam)
    let topicAnalysis = [];
    if (quizAttempt.exam.topic) {
      topicAnalysis = [{
        topicId: quizAttempt.exam.topic._id ? quizAttempt.exam.topic._id.toString() : quizAttempt.exam.topic.toString(),
        topicName: quizAttempt.exam.topic.name || '',
        correct: correctAnswers,
        total: totalQuestions,
        percent: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
      }];
    }

    return {
      score,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      timeSpent,
      topicAnalysis,
      tagAnalysis
    };
  },
  
  // Lịch sử tổng hợp các đề đã làm
  async getUserExamHistorySummary(userId) {
    // Lấy tất cả quizAttempt của user
    const attempts = await QuizAttempt.find({ user: userId, status: 'completed' })
      .populate({ path: 'exam', select: 'title topic' })
      .sort({ startTime: -1 })
      .lean();
    // Gom nhóm theo examId
    const examMap = {};
    for (const att of attempts) {
      const examId = att.exam._id.toString();
      if (!examMap[examId]) {
        examMap[examId] = {
          examId,
          title: att.exam.title,
          topic: att.exam.topic,
          totalAttempts: 0,
          bestScore: 0,
          sumScore: 0,
          lastAttempt: att.startTime
        };
      }
      examMap[examId].totalAttempts++;
      examMap[examId].bestScore = Math.max(examMap[examId].bestScore, att.score);
      examMap[examId].sumScore += att.score;
      if (att.startTime > examMap[examId].lastAttempt) {
        examMap[examId].lastAttempt = att.startTime;
      }
    }
    // Tính averageScore
    const result = Object.values(examMap).map(e => ({
      ...e,
      averageScore: e.totalAttempts > 0 ? Math.round(e.sumScore / e.totalAttempts) : 0
    }));
    return result;
  },

};

module.exports = quizAttemptService; 