const Joi = require('joi');

// Custom messages
const customMessages = {
  'string.empty': '{{#label}} cannot be empty',
  'string.min': '{{#label}} must be at least {{#limit}} characters long',
  'string.max': '{{#label}} cannot be longer than {{#limit}} characters',
  'any.required': '{{#label}} is required',
  'any.only': '{{#label}} must match the required value'
};

// Topic schema
const topicSchema = Joi.object({
  name: Joi.string().required().min(2).max(100)
    .messages({
      'string.empty': 'Topic name cannot be empty',
      'string.min': 'Topic name must be at least 2 characters long',
      'string.max': 'Topic name cannot be longer than 100 characters',
      'any.required': 'Topic name is required'
    }),
  description: Joi.string().max(500)
    .messages({
      'string.max': 'Description cannot be longer than 500 characters'
    }),
  parentTopic: Joi.string()
    .messages({
      'string.base': 'Parent topic must be a valid ID'
    }),
  category: Joi.string().max(50)
    .messages({
      'string.max': 'Category cannot be longer than 50 characters'
    }),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced')
    .messages({
      'any.only': 'Difficulty must be one of: beginner, intermediate, advanced'
    }),
  order: Joi.number().min(0).default(0)
    .messages({
      'number.min': 'Order cannot be negative'
    }),
  isActive: Joi.boolean().default(true)
}).messages(customMessages);

// Topic update schema
const topicUpdateSchema = topicSchema.fork(
  ['name', 'description', 'parentTopic', 'category', 'difficulty', 'order', 'isActive'],
  (schema) => schema.optional()
);

// Topic ID param schema
const topicIdParamSchema = Joi.object({
  id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Topic ID must be a valid MongoDB ObjectId',
      'any.required': 'Topic ID is required'
    })
});

// Topic search query schema
const topicSearchQuerySchema = Joi.object({
  name: Joi.string(),
  parentTopic: Joi.string().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Parent topic ID must be a valid MongoDB ObjectId'
    }),
  category: Joi.string(),
  difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
  isActive: Joi.boolean(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  sortBy: Joi.string().valid('name', 'order', 'createdAt').default('order'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
}).messages(customMessages);

// Topic import schema
const topicImportSchema = Joi.object({
  topics: Joi.array().items(topicSchema).min(1).required()
    .messages({
      'array.min': 'Must import at least one topic',
      'any.required': 'Topics are required'
    })
}).messages(customMessages);

// Validation schemas cho từng route
module.exports = {
  // Create topic route
  createTopicValidation: {
    body: topicSchema
  },
  
  // Update topic route
  updateTopicValidation: {
    body: topicUpdateSchema,
    params: topicIdParamSchema
  },
  
  // Delete topic route
  deleteTopicValidation: {
    params: topicIdParamSchema
  },
  
  // Get topics route
  getTopicsValidation: {
    query: topicSearchQuerySchema
  },
  
  // Import topics route
  importTopicsValidation: {
    body: topicImportSchema
  },
  
  // Backwards compatibility
  topicSchema,
  topicUpdateSchema,
  topicSearchSchema: topicSearchQuerySchema,
  topicImportSchema
}; 