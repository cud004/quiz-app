const Joi = require('joi');

// Custom messages
const customMessages = {
  'string.empty': '{{#label}} cannot be empty',
  'string.min': '{{#label}} must be at least {{#limit}} characters long',
  'string.max': '{{#label}} cannot be longer than {{#limit}} characters',
  'any.required': '{{#label}} is required',
  'any.only': '{{#label}} must match the required value'
};

// Tag schema
const tagSchema = Joi.object({
  name: Joi.string().required().min(2).max(50)
    .messages({
      'string.empty': 'Tag name cannot be empty',
      'string.min': 'Tag name must be at least 2 characters long',
      'string.max': 'Tag name cannot be longer than 50 characters',
      'any.required': 'Tag name is required'
    }),
  description: Joi.string().max(200)
    .messages({
      'string.max': 'Description cannot be longer than 200 characters'
    }),
  category: Joi.string().max(50)
    .messages({
      'string.max': 'Category cannot be longer than 50 characters'
    }),
  relatedTags: Joi.array().items(
    Joi.string().regex(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'Related tag must be a valid MongoDB ObjectId'
      })
  ),
  isActive: Joi.boolean().default(true)
}).messages(customMessages);

// Tag update schema
const tagUpdateSchema = tagSchema.fork(
  ['name', 'description', 'category', 'relatedTags', 'isActive'],
  (schema) => schema.optional()
);

// Tag ID param schema
const tagIdParamSchema = Joi.object({
  id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Tag ID must be a valid MongoDB ObjectId',
      'any.required': 'Tag ID is required'
    })
});

// Tag search query schema
const tagSearchQuerySchema = Joi.object({
  name: Joi.string(),
  category: Joi.string(),
  isActive: Joi.boolean(),
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(10),
  sortBy: Joi.string().valid('name', 'usageCount', 'createdAt').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
}).messages(customMessages);

// Tag import schema
const tagImportSchema = Joi.object({
  tags: Joi.array().items(tagSchema).min(1).required()
    .messages({
      'array.min': 'Must import at least one tag',
      'any.required': 'Tags are required'
    })
}).messages(customMessages);

// Validation schemas cho từng route
module.exports = {
  // Create tag route
  createTagValidation: {
    body: tagSchema
  },
  
  // Update tag route
  updateTagValidation: {
    body: tagUpdateSchema,
    params: tagIdParamSchema
  },
  
  // Delete tag route
  deleteTagValidation: {
    params: tagIdParamSchema
  },
  
  // Get tag by ID route
  getTagValidation: {
    params: tagIdParamSchema
  },
  
  // Get tags route
  getTagsValidation: {
    query: tagSearchQuerySchema
  },
  
  // Import tags route
  importTagsValidation: {
    body: tagImportSchema
  },
  
  // Backwards compatibility
  tagSchema,
  tagUpdateSchema,
  tagSearchSchema: tagSearchQuerySchema,
  tagImportSchema
}; 