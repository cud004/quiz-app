const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Question = require('../models/Question');

const ERROR_CODES = {
  INVALID_ID: 'INVALID_ID',
  EXAM_NOT_FOUND: 'EXAM_NOT_FOUND',
  INVALID_QUESTION_IDS: 'INVALID_QUESTION_IDS',
  NOT_ENOUGH_QUESTIONS: 'NOT_ENOUGH_QUESTIONS',
};

// Utility: Validate ObjectId
const validateObjectId = (id, errorMessage) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(errorMessage);
    error.errorCode = ERROR_CODES.INVALID_ID;
    throw error;
  }
};

// Create an exam manually
exports.createExam = async ({ title, description, questionIds, examType, recommendedFor, timeLimit, isPremium, price }) => {
    if (!title || !description) {
      const error = new Error('Title and description are required');
      error.errorCode = 'MISSING_FIELDS';
      throw error;
    }
  
    // Validate question IDs
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      const error = new Error('No question IDs provided');
      error.errorCode = ERROR_CODES.INVALID_QUESTION_IDS;
      throw error;
    }
  
    questionIds.forEach((id) => validateObjectId(id, `Invalid question ID: ${id}`));
  
    // Fetch questions
    const questions = await Question.find({ _id: { $in: questionIds }, isActive: true });
    if (questions.length !== questionIds.length) {
      const error = new Error('Some questions are invalid or inactive');
      error.errorCode = ERROR_CODES.INVALID_QUESTION_IDS;
      throw error;
    }
  
    // Create exam
    const exam = new Exam({
      title,
      description,
      questions: questionIds,
      examType,
      recommendedFor,
      timeLimit,
      isPremium,
      price,
    });
    await exam.save();
  
    // Trả về thông tin chi tiết của bài thi
    return await Exam.findById(exam._id).populate({
      path: 'questions',
      select: 'content options',
    });
  };

// Create an exam randomly
exports.createRandomExam = async ({ title, description, topic, questionCount, examType, timeLimit, isPremium, price }) => {
    if (!title || !description || !topic || !questionCount) {
      const error = new Error('Title, description, topic, and questionCount are required');
      error.errorCode = 'MISSING_FIELDS';
      throw error;
    }
  
    // Kiểm tra topic ID hợp lệ
    validateObjectId(topic, 'Invalid topic ID');
  
    // Phân bổ số lượng câu hỏi theo độ khó
    const easyCount = Math.ceil(questionCount * 0.4); // 40% câu hỏi dễ
    const mediumCount = Math.ceil(questionCount * 0.4); // 40% câu hỏi trung bình
    const hardCount = questionCount - easyCount - mediumCount; // 20% câu hỏi khó
  
    // Lấy danh sách câu hỏi ngẫu nhiên theo độ khó
    const results = await Question.aggregate([
      { $match: { topic: new mongoose.Types.ObjectId(topic), isActive: true } },
      {
        $facet: {
          easy: [{ $match: { difficulty: 'easy' } }, { $sample: { size: easyCount } }],
          medium: [{ $match: { difficulty: 'medium' } }, { $sample: { size: mediumCount } }],
          hard: [{ $match: { difficulty: 'hard' } }, { $sample: { size: hardCount } }],
        },
      },
    ]);
  
    // Kết hợp các câu hỏi từ các nhóm
    const questions = [...results[0].easy, ...results[0].medium, ...results[0].hard];
  
    // Nếu không đủ câu hỏi, lấy thêm từ các nhóm khác để bù vào
    if (questions.length < questionCount) {
      const additionalQuestions = await Question.aggregate([
        { $match: { topic: new mongoose.Types.ObjectId(topic), isActive: true, _id: { $nin: questions.map((q) => q._id) } } },
        { $sample: { size: questionCount - questions.length } },
      ]);
      questions.push(...additionalQuestions);
    }
  
    // Nếu vẫn không đủ câu hỏi, trả về lỗi
    if (questions.length < questionCount) {
      const error = new Error(`Not enough questions available. Found ${questions.length}, but ${questionCount} required.`);
      error.errorCode = ERROR_CODES.NOT_ENOUGH_QUESTIONS;
      throw error;
    }
  
    // Tạo đề kiểm tra
    const exam = new Exam({
      title,
      description,
      questions: questions.map((q) => q._id),
      examType,
      timeLimit,
      isPremium,
      price,
    });
    await exam.save();
  
    // Trả về thông tin chi tiết của bài thi
    return await Exam.findById(exam._id).populate({
      path: 'questions',
      select: 'content options',
    });
  };
// Get all exams
exports.getExams = async (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const exams = await Exam.find({ isActive: true })
      .skip(skip)
      .limit(limit)
      .populate('questions', 'content');
  
    const total = await Exam.countDocuments({ isActive: true });
  
    return { exams, total, page, limit };
  };
// Get an exam by ID
exports.getExamById = async (id) => {
    validateObjectId(id, 'Invalid exam ID');
    const exam = await Exam.findOne({ _id: id, isActive: true })
      .populate({
        path: 'questions',
        select: 'content options explanation topic',
        populate: { path: 'topic', select: 'name' }, // Thêm tên chủ đề
      });
  
    if (!exam) {
      const error = new Error('Exam not found or inactive');
      error.errorCode = ERROR_CODES.EXAM_NOT_FOUND;
      throw error;
    }
  
    return exam;
  };
// Update an exam
exports.updateExam = async (id, updateData) => {
    validateObjectId(id, 'Invalid exam ID');
    const exam = await Exam.findByIdAndUpdate(id, updateData, { new: true }).populate('questions', 'content');
    if (!exam) {
      const error = new Error('Exam not found');
      error.errorCode = ERROR_CODES.EXAM_NOT_FOUND;
      throw error;
    }
    return exam;
  };

// Delete an exam
exports.deleteExam = async (id) => {
    validateObjectId(id, 'Invalid exam ID');
    const exam = await Exam.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!exam) {
      const error = new Error('Exam not found');
      error.errorCode = ERROR_CODES.EXAM_NOT_FOUND;
      throw error;
    }
    return { message: 'Exam soft deleted successfully', examId: id };
  };