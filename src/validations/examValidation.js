const Joi = require('joi');

// Custom messages
const customMessages = {
  'string.empty': '{{#label}} cannot be empty',
  'string.min': '{{#label}} must be at least {{#limit}} characters long',
  'string.max': '{{#label}} cannot be longer than {{#limit}} characters',
  'any.required': '{{#label}} is required',
  'array.min': '{{#label}} must contain at least {{#limit}} items',
  'number.min': '{{#label}} must be at least {{#limit}}',
  'number.max': '{{#label}} cannot be greater than {{#limit}}',
  'any.only': '{{#label}} must match one of the allowed values'
};

// Exam question item schema
const examQuestionSchema = Joi.object({
  question: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Question ID must be a valid MongoDB ObjectId',
      'any.required': 'Question ID is required'
    }),
  points: Joi.number().integer().min(1).required()
    .messages({
      'number.base': 'Points must be a number',
      'number.integer': 'Points must be an integer',
      'number.min': 'Points must be at least 1',
      'any.required': 'Points are required'
    }),
  order: Joi.number().integer().min(0)
    .messages({
      'number.base': 'Order must be a number',
      'number.integer': 'Order must be an integer',
      'number.min': 'Order must be at least 0'
    })
});

// Exam schema
const examSchema = Joi.object({
  title: Joi.string().required().min(5).max(100)
    .messages({
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot be longer than 100 characters',
      'any.required': 'Title is required'
    }),
  description: Joi.string().max(1000)
    .messages({
      'string.max': 'Description cannot be longer than 1000 characters'
    }),
  instructions: Joi.string().max(2000)
    .messages({
      'string.max': 'Instructions cannot be longer than 2000 characters'
    }),
  timeLimit: Joi.number().integer().min(1).max(300).default(60)
    .messages({
      'number.base': 'Time limit must be a number',
      'number.integer': 'Time limit must be an integer',
      'number.min': 'Time limit must be at least 1 minute',
      'number.max': 'Time limit cannot be longer than 300 minutes (5 hours)'
    }),
  passingScore: Joi.number().min(0).max(100).default(70)
    .messages({
      'number.base': 'Passing score must be a number',
      'number.min': 'Passing score must be at least 0',
      'number.max': 'Passing score cannot be greater than 100'
    }),
  questions: Joi.array().items(examQuestionSchema).min(1)
    .messages({
      'array.min': 'Exam must contain at least 1 question'
    }),
  isPublished: Joi.boolean().default(false),
  allowReview: Joi.boolean().default(true),
  randomizeQuestions: Joi.boolean().default(false),
  accessLevel: Joi.string().valid('free', 'premium', 'private').default('free')
    .messages({
      'any.only': 'Access level must be one of: free, premium, private'
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
  )
}).messages(customMessages);

// Exam update schema (fork from main schema, making all fields optional)
const examUpdateSchema = examSchema.fork(
  ['title', 'description', 'instructions', 'timeLimit', 'passingScore', 
   'questions', 'isPublished', 'allowReview', 'randomizeQuestions', 'topics', 'tags', 'accessLevel'],
  (schema) => schema.optional()
);

// Exam ID param schema
const examIdParamSchema = Joi.object({
  id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Exam ID must be a valid MongoDB ObjectId',
      'any.required': 'Exam ID is required'
    })
});

// Exam search query schema
const examSearchQuerySchema = Joi.object({
  title: Joi.string(),
  isPublished: Joi.boolean(),
  accessLevel: Joi.string().valid('free', 'premium', 'private'),
  createdBy: Joi.string().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Creator ID must be a valid MongoDB ObjectId'
    }),
  topic: Joi.string().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Topic ID must be a valid MongoDB ObjectId'
    }),
  tag: Joi.string().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Tag ID must be a valid MongoDB ObjectId'
    }),
  searchText: Joi.string(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  sortBy: Joi.string().valid('createdAt', 'title', 'timeLimit').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
}).messages(customMessages);

// Publish/Unpublish schema
const examPublishSchema = Joi.object({
  isPublished: Joi.boolean().required()
    .messages({
      'any.required': 'Publication status is required'
    })
}).messages(customMessages);

// Random exam generation schema
const randomExamSchema = Joi.object({
  title: Joi.string().min(5).max(100),
  description: Joi.string().max(1000),
  questionCount: Joi.number().integer().min(1).required()
    .messages({
      'number.base': 'Question count must be a number',
      'number.integer': 'Question count must be an integer',
      'number.min': 'Question count must be at least 1',
      'any.required': 'Question count is required'
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
  difficulty: Joi.string().valid('easy', 'medium', 'hard'),
  difficultyDistribution: Joi.object({
    easy: Joi.number().min(0).max(100)
      .messages({
        'number.base': 'Easy percentage must be a number',
        'number.min': 'Easy percentage cannot be negative',
        'number.max': 'Easy percentage cannot exceed 100'
      }),
    medium: Joi.number().min(0).max(100)
      .messages({
        'number.base': 'Medium percentage must be a number',
        'number.min': 'Medium percentage cannot be negative',
        'number.max': 'Medium percentage cannot exceed 100'
      }),
    hard: Joi.number().min(0).max(100)
      .messages({
        'number.base': 'Hard percentage must be a number',
        'number.min': 'Hard percentage cannot be negative',
        'number.max': 'Hard percentage cannot exceed 100'
      })
  }).custom((value, helpers) => {
    const { easy = 0, medium = 0, hard = 0 } = value;
    const sum = easy + medium + hard;
    
    if (Math.abs(sum - 100) > 1) { // Allow small rounding errors
      return helpers.error('difficultyDistribution.sum', { sum });
    }
    
    return value;
  }).messages({
    'difficultyDistribution.sum': 'The sum of difficulty percentages must equal 100, got {{#sum}}'
  }),
  pointsDistribution: Joi.string().valid('equal', 'byDifficulty').default('equal')
    .messages({
      'any.only': 'Points distribution must be one of: equal, byDifficulty'
    }),
  timeLimit: Joi.number().integer().min(1).max(300),
  accessLevel: Joi.string().valid('free', 'premium', 'private').default('free'),
  randomizeQuestions: Joi.boolean().default(true),
  allowReview: Joi.boolean().default(true),
  passingScore: Joi.number().min(0).max(100).default(50)
    .messages({
      'number.base': 'Passing score must be a number',
      'number.min': 'Passing score cannot be negative',
      'number.max': 'Passing score cannot exceed 100'
    })
}).messages(customMessages)
.custom((value, helpers) => {
  // Không thể đồng thời chỉ định cả difficulty và difficultyDistribution
  if (value.difficulty && value.difficultyDistribution) {
    return helpers.error('object.xor', { 
      peers: ['difficulty', 'difficultyDistribution'] 
    });
  }
  return value;
}).messages({
  'object.xor': 'Cannot specify both difficulty and difficultyDistribution'
});

// Exam statistics update schema
const examStatsSchema = Joi.object({
  totalAttempts: Joi.number().min(0),
  completionRate: Joi.number().min(0).max(100),
  averageScore: Joi.number().min(0).max(100),
  passRate: Joi.number().min(0).max(100)
}).messages(customMessages);

// Validation schemas for each route
module.exports = {
  // Create exam route
  createExamValidation: {
    body: examSchema
  },
  
  // Update exam route
  updateExamValidation: {
    body: examUpdateSchema,
    params: examIdParamSchema
  },
  
  // Delete exam route
  deleteExamValidation: {
    params: examIdParamSchema
  },
  
  // Get exam by ID route
  getExamValidation: {
    params: examIdParamSchema
  },
  
  // Get exams route
  getExamsValidation: {
    query: examSearchQuerySchema
  },
  
  // Publish/unpublish exam route
  publishExamValidation: {
    params: examIdParamSchema,
    body: examPublishSchema
  },
  
  // Generate random exam route
  generateRandomExamValidation: {
    body: randomExamSchema
  },
  
  // Duplicate exam route
  duplicateExamValidation: {
    params: examIdParamSchema
  },
  
  // Update exam stats route
  updateExamStatsValidation: {
    params: examIdParamSchema,
    body: examStatsSchema
  },
  
  // Backward compatibility
  examSchema,
  examUpdateSchema,
  examIdParamSchema,
  examSearchQuerySchema,
  examPublishSchema,
  randomExamSchema,
  examStatsSchema
}; 