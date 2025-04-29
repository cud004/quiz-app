const mongoose = require('mongoose');
const Question = require('../models/Question');
const Topic = require('../models/Topic');
const Tag = require('../models/Tag');
const xlsx = require('xlsx');

const ERROR_CODES = {
  INVALID_ID: 'INVALID_ID',
  QUESTION_CONTENT_EXISTS: 'QUESTION_CONTENT_EXISTS',
  QUESTION_NOT_FOUND: 'QUESTION_NOT_FOUND',
  INVALID_TOPIC: 'INVALID_TOPIC',
  DUPLICATE_QUESTIONS_IN_REQUEST: 'DUPLICATE_QUESTIONS_IN_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TAG: 'INVALID_TAG',
  TAGS_NOT_FOUND: 'TAGS_NOT_FOUND',
  INVALID_TAG_TOPIC: 'INVALID_TAG_TOPIC',
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
const validateTopic = async (topicId) => {
  if (!mongoose.Types.ObjectId.isValid(topicId)) {
    throw { errorCode: 'INVALID_TOPIC', message: 'Invalid topic ID format' };
  }
  const topic = await Topic.findById(topicId);
  if (!topic) {
    throw { errorCode: 'INVALID_TOPIC', message: 'Topic not found' };
  }
  return topic;
};

// Utility: Check if tags exist and belong to the topic
const validateTags = async (tagIds, topicId) => {
  if (!tagIds || tagIds.length === 0) {
    return [];
  }

  // Kiểm tra tính hợp lệ của các ID tag
  for (const id of tagIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw { errorCode: 'INVALID_TAG', message: `Invalid tag ID format: ${id}` };
    }
  }

  // Lấy tất cả các tag
  const tags = await Tag.find({ _id: { $in: tagIds } });
  
  // Kiểm tra xem có tìm thấy đủ số tag không
  if (tags.length !== tagIds.length) {
    const foundIds = tags.map(t => t._id.toString());
    const missingIds = tagIds.filter(id => !foundIds.includes(id));
    throw { errorCode: 'TAGS_NOT_FOUND', message: `Tags not found: ${missingIds.join(', ')}` };
  }
  
  // Kiểm tra xem tất cả các tag có thuộc về topic không
  for (const tag of tags) {
    if (tag.topic.toString() !== topicId.toString()) {
      throw { errorCode: 'INVALID_TAG_TOPIC', message: `Tag ${tag.name} does not belong to the specified topic` };
    }
  }
  
  return tags;
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

// Validate topic access for personal content
exports.validateTopicAccess = async (topicId, userId) => {
  const topic = await validateTopic(topicId);
  
  // Kiểm tra xem topic có phải là topic cá nhân của user không
  // Hoặc topic là công khai (không phải cá nhân)
  if (topic.isPersonal && topic.createdBy.toString() !== userId.toString()) {
    throw { errorCode: 'FORBIDDEN', message: 'You do not have access to this topic' };
  }
  
  return topic;
};

// Create a single question
exports.createQuestion = async ({ content, options, topic, difficulty, explanation, tags }) => {
  // Kiểm tra nội dung câu hỏi trùng lặp
  await validateDuplicateQuestion(content);

  // Kiểm tra ID và sự tồn tại của chủ đề
  await validateTopic(topic);

  // Kiểm tra số lượng options
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
  validateOptions(options);

  // Kiểm tra số lượng tags
  if (tags && tags.length > 0) {
    await validateTags(tags, topic);
  }

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
  return await Question.findById(question._id).populate('topic', 'name').populate('tags', 'name');
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
    await validateTopic(question.topic);
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
    validateOptions(question.options);
    if (question.tags && question.tags.length > 0) {
      await validateTags(question.tags, question.topic);
    }
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
  return await Question.find({ _id: { $in: savedQuestions.map((q) => q._id) } }).populate('topic', 'name').populate('tags', 'name');
};

// Import questions from Excel/CSV file
exports.importQuestionsFromFile = async (file, userId) => {
  try {
    // Đọc file Excel/CSV
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    if (!data || data.length === 0) {
      throw new Error('No data found in the file');
    }
    
    // Validate data format
    const questions = [];
    for (const row of data) {
      // Kiểm tra các trường bắt buộc
      if (!row.content || !row.options || !row.topic) {
        throw new Error('Missing required fields: content, options, topic');
      }
      
      // Tìm hoặc tạo topic nếu chưa tồn tại
      let topic;
      try {
        // Nếu là ObjectId, thử tìm topic theo ID
        if (mongoose.Types.ObjectId.isValid(row.topic)) {
          topic = await Topic.findById(row.topic);
        }
        
        // Nếu không tìm thấy theo ID, tìm theo tên
        if (!topic) {
          topic = await Topic.findOne({ name: row.topic });
        }
        
        // Nếu vẫn không tìm thấy, tạo mới topic cá nhân
        if (!topic) {
          topic = new Topic({
            name: row.topic,
            description: `Auto-created topic for imported questions: ${row.topic}`,
            createdBy: userId,
            isPersonal: true
          });
          await topic.save();
        } else {
          // Kiểm tra quyền truy cập nếu topic đã tồn tại
          if (topic.isPersonal && topic.createdBy.toString() !== userId.toString()) {
            throw new Error(`You don't have access to topic: ${row.topic}`);
          }
        }
      } catch (error) {
        throw new Error(`Error processing topic "${row.topic}": ${error.message}`);
      }
      
      // Xử lý tags nếu có
      let tagIds = [];
      if (row.tags) {
        let tagNames = [];
        if (typeof row.tags === 'string') {
          tagNames = row.tags.split(',').map(tag => tag.trim());
        } else if (Array.isArray(row.tags)) {
          tagNames = row.tags;
        }
        
        // Tìm hoặc tạo tags
        for (const tagName of tagNames) {
          if (!tagName) continue;
          
          let tag = await Tag.findOne({ name: tagName, topic: topic._id });
          if (!tag) {
            tag = new Tag({
              name: tagName,
              description: `Auto-created tag for imported questions`,
              topic: topic._id
            });
            await tag.save();
          }
          tagIds.push(tag._id);
        }
      }
      
      // Parse options
      let options = [];
      try {
        if (typeof row.options === 'string') {
          // Nếu options là chuỗi JSON
          options = JSON.parse(row.options);
        } else {
          // Nếu options là mảng hoặc object
          options = row.options;
        }
        
        // Đảm bảo options có định dạng đúng
        if (!Array.isArray(options)) {
          throw new Error('Options must be an array');
        }
        
        // Kiểm tra mỗi option có text và isCorrect
        options = options.map(opt => {
          if (typeof opt === 'string') {
            // Nếu option là chuỗi, tạo object với isCorrect = false
            return { text: opt, isCorrect: false };
          } else if (typeof opt === 'object' && opt.text) {
            // Nếu option là object, đảm bảo có isCorrect
            return { 
              text: opt.text, 
              isCorrect: typeof opt.isCorrect === 'boolean' ? opt.isCorrect : false 
            };
          } else {
            throw new Error('Invalid option format');
          }
        });
        
        // Đảm bảo có ít nhất một đáp án đúng
        if (!options.some(opt => opt.isCorrect)) {
          options[0].isCorrect = true; // Mặc định đáp án đầu tiên là đúng nếu không có đáp án đúng
        }
      } catch (error) {
        throw new Error(`Error parsing options for question "${row.content}": ${error.message}`);
      }
      
      // Tạo câu hỏi
      questions.push({
        content: row.content,
        options: options,
        topic: topic._id,
        tags: tagIds,
        difficulty: row.difficulty || 'medium',
        explanation: row.explanation || '',
        createdBy: userId,
        isPersonal: true
      });
    }
    
    // Tạo nhiều câu hỏi cùng lúc
    return await this.createManyQuestions(questions);
  } catch (error) {
    throw new Error(`Import failed: ${error.message}`);
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
    query.tags = { $in: Array.isArray(filters.tags) ? filters.tags : [filters.tags] };
  }
  if (filters.content) {
    query.content = { $regex: filters.content, $options: 'i' }; // Tìm kiếm theo nội dung
  }

  const questions = await Question.find(query)
    .skip(skip)
    .limit(limit)
    .populate('topic', 'name')
    .populate('tags', 'name');
  const total = await Question.countDocuments(query);

  return { questions, total, page, limit };
};

// Get a question by ID
exports.getQuestionById = async (id) => {
  validateObjectId(id, 'Invalid question ID');
  const question = await Question.findById(id).populate('topic', 'name').populate('tags', 'name');
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
  return await Question.findById(question._id).populate('topic', 'name').populate('tags', 'name');
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