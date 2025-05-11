const Joi = require('joi');

// Custom messages
const customMessages = {
  'string.empty': '{{#label}} cannot be empty',
  'string.min': '{{#label}} must be at least {{#limit}} characters long',
  'string.max': '{{#label}} cannot be longer than {{#limit}} characters',
  'any.required': '{{#label}} is required',
  'array.min': '{{#label}} must contain at least {{#limit}} items',
  'number.min': '{{#label}} must be at least {{#limit}}',
  'any.only': '{{#label}} must match one of the allowed values'
};

// Option schema (for question options)
const optionSchema = Joi.object({
  label: Joi.string().required().max(5)
    .messages({
      'string.empty': 'Option label cannot be empty',
      'string.max': 'Option label cannot be longer than 5 characters',
      'any.required': 'Option label is required'
    }),
  text: Joi.string().required().max(500)
    .messages({
      'string.empty': 'Option text cannot be empty',
      'string.max': 'Option text cannot be longer than 500 characters',
      'any.required': 'Option text is required'
    })
});

// Question schema
const questionSchema = Joi.object({
  content: Joi.string().required().min(5).max(1000)
    .messages({
      'string.empty': 'Question content cannot be empty',
      'string.min': 'Question content must be at least 5 characters long',
      'string.max': 'Question content cannot be longer than 1000 characters',
      'any.required': 'Question content is required'
    }),
  options: Joi.array().items(optionSchema).min(2).required()
    .messages({
      'array.min': 'At least 2 options are required',
      'any.required': 'Options are required'
    }),
  correctAnswer: Joi.string().required()
    .messages({
      'string.empty': 'Correct answer cannot be empty',
      'any.required': 'Correct answer is required'
    }),
  explanation: Joi.string().max(2000)
    .messages({
      'string.max': 'Explanation cannot be longer than 2000 characters'
    }),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium')
    .messages({
      'any.only': 'Difficulty must be one of: easy, medium, hard'
    }),
  points: Joi.number().integer().min(1).default(1)
    .messages({
      'number.base': 'Points must be a number',
      'number.integer': 'Points must be an integer',
      'number.min': 'Points must be at least 1'
    }),
  topics: Joi.array().items(
    Joi.string().regex(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'Topic ID must be a valid MongoDB ObjectId'
      })
  ),
  tags: Joi.array().items(
    Joi.string().regex(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'Tag ID must be a valid MongoDB ObjectId'
      })
  ),
  isActive: Joi.boolean().default(true)
}).messages(customMessages);

// Question update schema
const questionUpdateSchema = questionSchema.fork(
  ['content', 'options', 'correctAnswer', 'explanation', 'difficulty', 'points', 'topics', 'tags', 'isActive'],
  (schema) => schema.optional()
);

// Question ID param schema
const questionIdParamSchema = Joi.object({
  id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Question ID must be a valid MongoDB ObjectId',
      'any.required': 'Question ID is required'
    })
});

// Question search query schema
const questionSearchQuerySchema = Joi.object({
  content: Joi.string(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard'),
  topic: Joi.string().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Topic ID must be a valid MongoDB ObjectId'
    }),
  tag: Joi.string().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Tag ID must be a valid MongoDB ObjectId'
    }),
  createdBy: Joi.string().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
    }),
  isActive: Joi.boolean(),
  searchText: Joi.string(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  sortBy: Joi.string().valid('createdAt', 'difficulty', 'usageCount', 'stats.correctRate').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
}).messages(customMessages);

// Question import schema
const questionImportSchema = Joi.object({
  questions: Joi.array().items(questionSchema).min(1).required()
    .messages({
      'array.min': 'Must import at least one question',
      'any.required': 'Questions are required'
    })
}).messages(customMessages);

// Validation schemas cho từng route
module.exports = {
  // Create question route
  createQuestionValidation: {
    body: questionSchema
  },
  
  // Update question route
  updateQuestionValidation: {
    body: questionUpdateSchema,
    params: questionIdParamSchema
  },
  
  // Delete question route
  deleteQuestionValidation: {
    params: questionIdParamSchema
  },
  
  // Get question by ID route
  getQuestionValidation: {
    params: questionIdParamSchema
  },
  
  // Get questions route
  getQuestionsValidation: {
    query: questionSearchQuerySchema
  },
  
  // Import questions route
  importQuestionsValidation: {
    body: questionImportSchema
  },
  
  // Backwards compatibility
  questionSchema,
  questionUpdateSchema,
  questionSearchSchema: questionSearchQuerySchema,
  questionImportSchema
}; 