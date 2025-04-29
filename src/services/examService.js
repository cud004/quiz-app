const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Topic = require('../models/Topic');
const Tag = require('../models/Tag');

const ERROR_CODES = {
  INVALID_ID: 'INVALID_ID',
  EXAM_NOT_FOUND: 'EXAM_NOT_FOUND',
  INVALID_QUESTION_IDS: 'INVALID_QUESTION_IDS',
  NOT_ENOUGH_QUESTIONS: 'NOT_ENOUGH_QUESTIONS',
  INVALID_TAG: 'INVALID_TAG',
  TAGS_NOT_FOUND: 'TAGS_NOT_FOUND',
};

// Utility: Validate ObjectId
const validateObjectId = (id, errorMessage) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(errorMessage);
    error.errorCode = ERROR_CODES.INVALID_ID;
    throw error;
  }
};

// Validate questions access for personal content
exports.validateQuestionsAccess = async (questionIds, userId) => {
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    throw { errorCode: 'INVALID_QUESTIONS', message: 'No questions provided' };
  }

  // Kiểm tra tính hợp lệ của các ID câu hỏi
  for (const id of questionIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw { errorCode: 'INVALID_QUESTION_ID', message: `Invalid question ID format: ${id}` };
    }
  }

  // Lấy tất cả các câu hỏi
  const questions = await Question.find({ _id: { $in: questionIds } });
  
  // Kiểm tra xem có tìm thấy đủ số câu hỏi không
  if (questions.length !== questionIds.length) {
    const foundIds = questions.map(q => q._id.toString());
    const missingIds = questionIds.filter(id => !foundIds.includes(id));
    throw { errorCode: 'QUESTIONS_NOT_FOUND', message: `Questions not found: ${missingIds.join(', ')}` };
  }
  
  // Kiểm tra quyền truy cập cho từng câu hỏi
  for (const question of questions) {
    if (question.isPersonal && question.createdBy.toString() !== userId.toString()) {
      throw { errorCode: 'FORBIDDEN', message: `You do not have access to question: ${question._id}` };
    }
  }
  
  return questions;
};

// Validate topics access for personal content
exports.validateTopicsAccess = async (topicIds, userId) => {
  if (!Array.isArray(topicIds) || topicIds.length === 0) {
    throw { errorCode: 'INVALID_TOPICS', message: 'No topics provided' };
  }

  // Kiểm tra tính hợp lệ của các ID chủ đề
  for (const id of topicIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw { errorCode: 'INVALID_TOPIC_ID', message: `Invalid topic ID format: ${id}` };
    }
  }

  // Lấy tất cả các chủ đề
  const topics = await Topic.find({ _id: { $in: topicIds } });
  
  // Kiểm tra xem có tìm thấy đủ số chủ đề không
  if (topics.length !== topicIds.length) {
    const foundIds = topics.map(t => t._id.toString());
    const missingIds = topicIds.filter(id => !foundIds.includes(id));
    throw { errorCode: 'TOPICS_NOT_FOUND', message: `Topics not found: ${missingIds.join(', ')}` };
  }
  
  // Kiểm tra quyền truy cập cho từng chủ đề
  for (const topic of topics) {
    if (topic.isPersonal && topic.createdBy.toString() !== userId.toString()) {
      throw { errorCode: 'FORBIDDEN', message: `You do not have access to topic: ${topic.name}` };
    }
  }
  
  return topics;
};

// Validate tags exist
exports.validateTags = async (tagIds) => {
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    return [];
  }

  // Kiểm tra tính hợp lệ của các ID tag
  for (const id of tagIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw { errorCode: ERROR_CODES.INVALID_TAG, message: `Invalid tag ID format: ${id}` };
    }
  }

  // Lấy tất cả các tag
  const tags = await Tag.find({ _id: { $in: tagIds }, isActive: true });
  
  // Kiểm tra xem có tìm thấy đủ số tag không
  if (tags.length !== tagIds.length) {
    const foundIds = tags.map(t => t._id.toString());
    const missingIds = tagIds.filter(id => !foundIds.includes(id));
    throw { errorCode: ERROR_CODES.TAGS_NOT_FOUND, message: `Tags not found or inactive: ${missingIds.join(', ')}` };
  }
  
  return tags;
};

// Create an exam manually
exports.createExam = async (examData) => {
  // Validate tags if provided
  if (examData.tags && examData.tags.length > 0) {
    await exports.validateTags(examData.tags);
  }

  const exam = new Exam(examData);
  await exam.save();
  return exam.populate('topics tags');
};

// Create a random exam
exports.createRandomExam = async (examData) => {
  const { title, description, questionCount, topics, difficulty, timeLimit, isPremium, price, examType, status, createdBy, isPersonal, tags } = examData;

  // Validate required fields
  if (!title || !questionCount || questionCount <= 0) {
    throw { errorCode: 'INVALID_DATA', message: 'Title and a positive questionCount are required' };
  }

  // Validate tags if provided
  if (tags && tags.length > 0) {
    await exports.validateTags(tags);
  }

  // Build query to find questions
  const query = { isActive: true };
  
  // Add topic filter if provided
  if (topics && topics.length > 0) {
    query.topic = { $in: topics };
  }
  
  // Add difficulty filter if provided and not 'mixed'
  if (difficulty && difficulty !== 'mixed') {
    query.difficulty = difficulty;
  }
  
  // Add tag filter if provided
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }
  
  // Add filter for personal questions if creating a personal exam
  if (isPersonal) {
    query.createdBy = createdBy;
    query.isPersonal = true;
  } else {
    // For non-personal exams, only use public questions
    query.isPersonal = false;
  }

  // Count available questions
  const availableQuestionCount = await Question.countDocuments(query);
  if (availableQuestionCount < questionCount) {
    throw { 
      errorCode: 'INSUFFICIENT_QUESTIONS', 
      message: `Not enough questions available. Requested: ${questionCount}, Available: ${availableQuestionCount}` 
    };
  }

  // Get random questions
  const questions = await Question.aggregate([
    { $match: query },
    { $sample: { size: questionCount } },
    { $project: { _id: 1 } }
  ]);

  // Create the exam
  const exam = new Exam({
    title,
    description,
    questions: questions.map(q => q._id),
    topics: topics || [],
    tags: tags || [],
    timeLimit: timeLimit || 45,
    isPremium: isPremium || false,
    price: price || 0,
    difficulty: difficulty || 'mixed',
    examType: examType || 'practice',
    status: status || 'draft',
    createdBy,
    isPersonal
  });

  await exam.save();
  return exam.populate('topics tags');
};

// Get exams with pagination and filters
exports.getExams = async (page = 1, limit = 10, filters = {}) => {
  const query = {};
  
  // Apply filters
  if (filters.topics) {
    query.topics = { $in: Array.isArray(filters.topics) ? filters.topics : [filters.topics] };
  }
  if (filters.tags) {
    query.tags = { $in: Array.isArray(filters.tags) ? filters.tags : [filters.tags] };
  }
  if (filters.difficulty) {
    query.difficulty = filters.difficulty;
  }
  if (filters.examType) {
    query.examType = filters.examType;
  }
  if (filters.isPremium !== undefined) {
    query.isPremium = filters.isPremium === 'true';
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (typeof filters.isPersonal === 'boolean') {
    query.isPersonal = filters.isPersonal;
    
    // Nếu là đề thi cá nhân, cần thêm filter theo createdBy
    if (filters.isPersonal && filters.createdBy) {
      query.createdBy = filters.createdBy;
    }
  }

  // Only return active exams
  query.isActive = true;

  // Calculate skip value for pagination
  const skip = (page - 1) * limit;

  // Get exams with pagination
  const exams = await Exam.find(query)
    .populate('topics', 'name')
    .populate('tags', 'name')
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  // Get total count for pagination
  const total = await Exam.countDocuments(query);

  return {
    exams,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// Get an exam by ID
exports.getExamById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { errorCode: 'INVALID_ID', message: 'Invalid exam ID format' };
  }

  const exam = await Exam.findById(id)
    .populate('topics', 'name')
    .populate('tags', 'name')
    .populate({
      path: 'questions',
      populate: [
        { path: 'topic', select: 'name' },
        { path: 'tags', select: 'name' }
      ]
    });

  if (!exam) {
    throw { errorCode: 'EXAM_NOT_FOUND', message: 'Exam not found' };
  }

  return exam;
};

// Update an exam
exports.updateExam = async (id, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { errorCode: 'INVALID_ID', message: 'Invalid exam ID format' };
  }

  // Check if exam exists
  const exam = await Exam.findById(id);
  if (!exam) {
    throw { errorCode: 'EXAM_NOT_FOUND', message: 'Exam not found' };
  }

  // Validate tags if provided
  if (updateData.tags && updateData.tags.length > 0) {
    await exports.validateTags(updateData.tags);
  }

  // Update exam
  const updatedExam = await Exam.findByIdAndUpdate(id, updateData, { new: true })
    .populate('topics', 'name')
    .populate('tags', 'name')
    .populate('questions', '-__v');

  return updatedExam;
};

// Delete an exam
exports.deleteExam = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw { errorCode: 'INVALID_ID', message: 'Invalid exam ID format' };
  }

  // Check if exam exists
  const exam = await Exam.findById(id);
  if (!exam) {
    throw { errorCode: 'EXAM_NOT_FOUND', message: 'Exam not found' };
  }

  // Soft delete by setting isActive to false
  const deletedExam = await Exam.findByIdAndUpdate(id, { isActive: false }, { new: true });

  return { message: 'Exam deleted successfully', id };
};