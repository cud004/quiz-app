const Joi = require('joi');

// Custom messages
const customMessages = {
  'string.empty': '{{#label}} cannot be empty',
  'string.min': '{{#label}} must be at least {{#limit}} characters long',
  'string.max': '{{#label}} cannot be longer than {{#limit}} characters',
  'any.required': '{{#label}} is required',
  'number.base': '{{#label}} must be a number',
  'number.min': '{{#label}} must be at least {{#limit}}',
  'number.max': '{{#label}} cannot be greater than {{#limit}}',
  'any.only': '{{#label}} must match one of the allowed values'
};

// Start quiz schema
const startQuizSchema = Joi.object({
  examId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Exam ID must be a valid MongoDB ObjectId',
      'any.required': 'Exam ID is required'
    })
}).messages(customMessages);

// ID param schema
const idParamSchema = Joi.object({
  id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'ID must be a valid MongoDB ObjectId',
      'any.required': 'ID is required'
    })
}).messages(customMessages);

// Submit answer schema
const submitAnswerSchema = Joi.object({
  questionId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Question ID must be a valid MongoDB ObjectId',
      'any.required': 'Question ID is required'
    }),
  answer: Joi.string().required()
    .messages({
      'string.empty': 'Answer cannot be empty',
      'any.required': 'Answer is required'
    })
}).messages(customMessages);

// Quiz attempt query schema
const quizAttemptQuerySchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  status: Joi.string().valid('in_progress', 'completed', 'abandoned'),
  examId: Joi.string().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Exam ID must be a valid MongoDB ObjectId'
    })
}).messages(customMessages);

// Quiz feedback schema
const quizFeedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required()
    .messages({
      'number.base': 'Rating must be a number',
      'number.integer': 'Rating must be an integer',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating cannot be greater than 5',
      'any.required': 'Rating is required'
    }),
  comment: Joi.string().max(500),
  difficulty: Joi.string().valid('too_easy', 'appropriate', 'too_hard')
    .messages({
      'any.only': 'Difficulty must be one of: too_easy, appropriate, too_hard'
    })
}).messages(customMessages);

// Validation schemas for each route
module.exports = {
  // Bắt đầu làm bài
  startQuizValidation: {
    body: startQuizSchema
  },
  
  // Lấy thông tin phiên làm bài
  getQuizAttemptValidation: {
    params: idParamSchema
  },
  
  // Danh sách lần làm bài của user
  getUserQuizAttemptsValidation: {
    query: quizAttemptQuerySchema
  },
  
  // Gửi câu trả lời
  submitAnswerValidation: {
    params: idParamSchema,
    body: submitAnswerSchema
  },
  
  // Kết thúc làm bài
  completeQuizValidation: {
    params: idParamSchema
  },
  
  // Lấy kết quả chi tiết bài làm
  getQuizResultValidation: {
    params: idParamSchema
  },
  
  // Thêm đánh giá
  addFeedbackValidation: {
    params: idParamSchema,
    body: quizFeedbackSchema
  },
  
  // Backward compatibility
  startQuizSchema,
  idParamSchema,
  submitAnswerSchema,
  quizAttemptQuerySchema,
  quizFeedbackSchema
}; 