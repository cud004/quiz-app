const mongoose = require('mongoose');
const Question = require('../models/Question');
const Topic = require('../models/Topic');

const ERROR_CODES = {
  INVALID_ID: 'INVALID_ID',
  QUESTION_CONTENT_EXISTS: 'QUESTION_CONTENT_EXISTS',
  QUESTION_NOT_FOUND: 'QUESTION_NOT_FOUND',
  INVALID_TOPIC: 'INVALID_TOPIC',
  DUPLICATE_QUESTIONS_IN_REQUEST: 'DUPLICATE_QUESTIONS_IN_REQUEST',
};

// Utility: Validate ObjectId
const validateObjectId = (id, errorMessage) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(errorMessage);
    error.errorCode = ERROR_CODES.INVALID_ID;
    throw error;
  }
};

// Utility: Check if Topic exists
const validateTopicExists = async (topicId) => {
  const topicExists = await Topic.findById(topicId);
  if (!topicExists) {
    const error = new Error('Topic not found');
    error.errorCode = ERROR_CODES.INVALID_TOPIC;
    throw error;
  }
};

// Utility: Check for duplicate question content
const validateDuplicateQuestion = async (content, excludeId = null) => {
  const query = { content };
  if (excludeId) query._id = { $ne: excludeId };

  const existingQuestion = await Question.findOne(query);
  if (existingQuestion) {
    const error = new Error('Question content already exists');
    error.errorCode = ERROR_CODES.QUESTION_CONTENT_EXISTS;
    throw error;
  }
};

// Create a single question
exports.createQuestion = async ({ content, options, topic, difficulty, explanation, tags }) => {
  // Kiểm tra nội dung câu hỏi trùng lặp
  await validateDuplicateQuestion(content);

  // Kiểm tra ID và sự tồn tại của chủ đề
  validateObjectId(topic, 'Invalid topic ID');
  await validateTopicExists(topic);

  // Kiểm tra số lượng options
  validateOptions(options);

  // Kiểm tra số lượng tags
  validateTags(tags);

  // Tạo câu hỏi mới
  const question = new Question({
    content,
    options,
    topic,
    difficulty: difficulty || 'medium',
    explanation,
    tags,
  });
  await question.save();

  // Cập nhật số lượng câu hỏi trong chủ đề
  const topicDoc = await Topic.findById(topic);
  if (topicDoc) {
    await topicDoc.updateQuestionCount();
  }

  // Trả về thông tin chi tiết của câu hỏi
  return await Question.findById(question._id).populate('topic', 'name');
};
// Create multiple questions
exports.createManyQuestions = async (questions) => {
  // Kiểm tra nội dung câu hỏi trùng lặp trong danh sách
  const contents = questions.map((q) => q.content);
  if (new Set(contents).size !== contents.length) {
    const error = new Error('Duplicate question contents in the request');
    error.errorCode = ERROR_CODES.DUPLICATE_QUESTIONS_IN_REQUEST;
    throw error;
  }

  // Kiểm tra từng câu hỏi
  for (const question of questions) {
    await validateDuplicateQuestion(question.content);
    validateObjectId(question.topic, `Invalid topic ID for question "${question.content}"`);
    await validateTopicExists(question.topic);
    validateOptions(question.options);
    validateTags(question.tags);
  }

  // Tạo nhiều câu hỏi
  const savedQuestions = await Question.insertMany(questions);

  // Cập nhật số lượng câu hỏi trong các chủ đề liên quan
  const topicIds = [...new Set(questions.map((q) => q.topic))]; // Lấy danh sách các topic ID duy nhất
  for (const topicId of topicIds) {
    const topicDoc = await Topic.findById(topicId);
    if (topicDoc) {
      await topicDoc.updateQuestionCount();
    }
  }

  // Trả về danh sách câu hỏi đã tạo
  return await Question.find({ _id: { $in: savedQuestions.map((q) => q._id) } }).populate('topic', 'name');
};
const validateOptions = (options) => {
  if (!options || options.length < 2) {
    const error = new Error('A question must have at least two options');
    error.errorCode = 'INVALID_OPTIONS';
    throw error;
  }

  const hasCorrectOption = options.some(option => option.isCorrect);
  if (!hasCorrectOption) {
    const error = new Error('At least one option must be marked as correct');
    error.errorCode = 'NO_CORRECT_OPTION';
    throw error;
  }
};
const validateTags = (tags) => {
  if (tags && tags.length > 3) {
    const error = new Error('A question can have at most 3 tags');
    error.errorCode = 'TOO_MANY_TAGS';
    throw error;
  }
};
// Get paginated questions
exports.getQuestions = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const query = { isActive: true };

  if (filters.topic) {
    query.topic = filters.topic;
  }
  if (filters.difficulty) {
    query.difficulty = filters.difficulty;
  }
  if (filters.tags) {
    query.tags = { $in: filters.tags };
  }
  if (filters.content) {
    query.content = { $regex: filters.content, $options: 'i' }; // Tìm kiếm theo nội dung
  }

  const questions = await Question.find(query)
    .skip(skip)
    .limit(limit)
    .populate('topic', 'name'); // Thêm tên chủ đề
  const total = await Question.countDocuments(query);

  return { questions, total, page, limit };
};
// Get a question by ID
exports.getQuestionById = async (id) => {
  validateObjectId(id, 'Invalid question ID');
  const question = await Question.findById(id).populate('topic', 'name');
  if (!question) {
    const error = new Error('Question not found');
    error.errorCode = ERROR_CODES.QUESTION_NOT_FOUND;
    throw error;
  }
  return question;
};

// Update a question
exports.updateQuestion = async (id, updateData) => {
  validateObjectId(id, 'Invalid question ID');
  if (updateData.content) {
    await validateDuplicateQuestion(updateData.content, id);
  }

  const question = await Question.findById(id);
  if (!question) {
    const error = new Error('Question not found');
    error.errorCode = ERROR_CODES.QUESTION_NOT_FOUND;
    throw error;
  }

  const oldTopicId = question.topic;

  // Cập nhật câu hỏi
  Object.assign(question, updateData);
  await question.save();

  // Cập nhật số lượng câu hỏi trong chủ đề cũ
  if (oldTopicId && oldTopicId.toString() !== question.topic.toString()) {
    const oldTopic = await Topic.findById(oldTopicId);
    if (oldTopic) {
      await oldTopic.updateQuestionCount();
    }
  }

  // Cập nhật số lượng câu hỏi trong chủ đề mới
  const newTopic = await Topic.findById(question.topic);
  if (newTopic) {
    await newTopic.updateQuestionCount();
  }

  // Trả về thông tin chi tiết của câu hỏi
  return await Question.findById(question._id).populate('topic', 'name');
};

// Delete a question
exports.deleteQuestion = async (id) => {
  validateObjectId(id, 'Invalid question ID');
  const question = await Question.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!question) {
    const error = new Error('Question not found');
    error.errorCode = ERROR_CODES.QUESTION_NOT_FOUND;
    throw error;
  }

  // Cập nhật số lượng câu hỏi trong chủ đề
  const topic = await Topic.findById(question.topic);
  if (topic) {
    await topic.updateQuestionCount();
  }

  return { message: 'Question deactivated', questionId: id };
};
exports.deleteManyQuestions = async (ids) => {
  // Kiểm tra danh sách ID
  if (!Array.isArray(ids) || ids.length === 0) {
    const error = new Error('No question IDs provided');
    error.errorCode = 'INVALID_IDS';
    throw error;
  }

  // Kiểm tra từng ID có hợp lệ không
  ids.forEach((id) => validateObjectId(id, `Invalid question ID: ${id}`));

  // Lấy danh sách các câu hỏi cần xóa
  const questions = await Question.find({ _id: { $in: ids }, isActive: true });
  if (questions.length === 0) {
    const error = new Error('No questions found to delete');
    error.errorCode = 'QUESTIONS_NOT_FOUND';
    throw error;
  }

  // Xóa mềm các câu hỏi
  await Question.updateMany({ _id: { $in: ids } }, { isActive: false });

  // Cập nhật số lượng câu hỏi trong các chủ đề liên quan
  const topicIds = [...new Set(questions.map((q) => q.topic))]; // Lấy danh sách các topic ID duy nhất
  for (const topicId of topicIds) {
    const topicDoc = await Topic.findById(topicId);
    if (topicDoc) {
      await topicDoc.updateQuestionCount();
    }
  }

  return { message: `${questions.length} questions deactivated` };
};