const Joi = require('joi');

// Custom messages
const customMessages = {
  'string.empty': '{{#label}} cannot be empty',
  'string.min': '{{#label}} must be at least {{#limit}} characters long',
  'string.max': '{{#label}} cannot be longer than {{#limit}} characters',
  'string.email': 'Please provide a valid email address',
  'any.required': '{{#label}} is required',
  'any.only': '{{#label}} must match the required value'
};

// User ID param schema
const userIdParamSchema = Joi.object({
  id: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId',
      'any.required': 'User ID is required'
    })
});

// User update schema
const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  email: Joi.string().email(),
  role: Joi.string().valid('user', 'admin'),
  status: Joi.string().valid('active', 'inactive', 'suspended', 'banned'),
  isActive: Joi.boolean(),
  profileImage: Joi.string().uri().allow(null, ''),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system'),
    language: Joi.string().valid('en', 'vi'),
    notifications: Joi.object({
      email: Joi.boolean(),
      push: Joi.boolean(),
      examReminders: Joi.boolean(),
      studyReminders: Joi.boolean(),
      achievementAlerts: Joi.boolean(),
      subscriptionAlerts: Joi.boolean()
    })
  })
}).messages(customMessages);

// User preferences update schema
const userPreferencesSchema = Joi.object({
  theme: Joi.string().valid('light', 'dark', 'system'),
  language: Joi.string().valid('en', 'vi'),
  notifications: Joi.object({
    email: Joi.boolean(),
    push: Joi.boolean(),
    examReminders: Joi.boolean(),
    studyReminders: Joi.boolean(),
    achievementAlerts: Joi.boolean(),
    subscriptionAlerts: Joi.boolean()
  })
}).messages(customMessages);

// Exam ID param schema for favorite
const examIdParamSchema = Joi.object({
  examId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Exam ID must be a valid MongoDB ObjectId',
      'any.required': 'Exam ID is required'
    })
});

// Validation schemas cho từng route
module.exports = {
  // Get user by ID route
  getUserValidation: {
    params: userIdParamSchema
  },
  
  // Update user route
  updateUserValidation: {
    body: userUpdateSchema,
    params: userIdParamSchema
  },
  
  // Delete user route
  deleteUserValidation: {
    params: userIdParamSchema
  },
  
  // Restore user route
  restoreUserValidation: {
    params: userIdParamSchema
  },
  
  // Hard delete user route
  hardDeleteUserValidation: {
    params: userIdParamSchema
  },
  
  // Get user stats route
  getUserStatsValidation: {
    params: userIdParamSchema
  },
  
  // Update preferences route
  updatePreferencesValidation: {
    body: userPreferencesSchema
  },
  
  // Toggle favorite exam route
  toggleFavoriteExamValidation: {
    params: examIdParamSchema
  }
}; 