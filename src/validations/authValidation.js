const Joi = require('joi');

// Custom messages
const customMessages = {
  'string.empty': '{{#label}} cannot be empty',
  'string.min': '{{#label}} must be at least {{#limit}} characters long',
  'string.max': '{{#label}} cannot be longer than {{#limit}} characters',
  'string.email': 'Please provide a valid email address',
  'string.pattern.base': '{{#label}} must match the required pattern',
  'any.required': '{{#label}} is required',
  'any.only': '{{#label}} must match the required value'
};

// Password validation schema
const passwordSchema = Joi.string()
  .min(8)
  .max(100)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
  .message('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character');

// Register schema
const registerSchema = Joi.object({
  name: Joi.string().required().min(2).max(50)
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot be longer than 50 characters',
      'any.required': 'Name is required'
    }),
  email: Joi.string().required().email()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: passwordSchema.required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password'
    }),
  role: Joi.string().valid('user', 'admin').default('user'),
  profileImage: Joi.string().uri()
    .messages({
      'string.uri': 'Please provide a valid URL for profile image'
    }),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system').default('system'),
    language: Joi.string().valid('en', 'vi').default('vi'),
    notifications: Joi.object({
      email: Joi.boolean().default(true),
      push: Joi.boolean().default(true),
      examReminders: Joi.boolean().default(true),
      studyReminders: Joi.boolean().default(true),
      achievementAlerts: Joi.boolean().default(true),
      subscriptionAlerts: Joi.boolean().default(true)
    })
  })
}).messages(customMessages);

// Login schema
const loginSchema = Joi.object({
  email: Joi.string().required().email()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string().required()
    .messages({
      'any.required': 'Password is required'
    }),
  rememberMe: Joi.boolean().default(false)
}).messages(customMessages);

// Update profile schema
const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  email: Joi.string().email(),
  profileImage: Joi.string().uri(),
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

// Update password schema
const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: passwordSchema.required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your new password'
    })
}).messages(customMessages);

// Forgot password schema
const forgotPasswordSchema = Joi.object({
  email: Joi.string().required().email()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
}).messages(customMessages);

// Reset password schema
const resetPasswordSchema = Joi.object({
  password: passwordSchema.required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Please confirm your password'
    })
}).messages(customMessages);

// Reset token param schema
const resetTokenParamSchema = Joi.object({
  resetToken: Joi.string().required()
    .messages({
      'any.required': 'Reset token is required'
    })
});

// OAuth login schema
const oauthLoginSchema = Joi.object({
  provider: Joi.string().valid('google', 'github').required()
    .messages({
      'any.only': 'Provider must be either google or github',
      'any.required': 'Provider is required'
    }),
  token: Joi.string().required()
    .messages({
      'any.required': 'Token is required'
    }),
  profile: Joi.object({
    id: Joi.string().required(),
    displayName: Joi.string().required(),
    email: Joi.string().email().required(),
    photo: Joi.string().uri()
  })
}).messages(customMessages);

// Validation schemas cho từng route
module.exports = {
  // Register route
  registerValidation: {
    body: registerSchema
  },
  
  // Login route
  loginValidation: {
    body: loginSchema
  },
  
  // Update profile route
  updateProfileValidation: {
    body: updateProfileSchema
  },
  
  // Update password route
  updatePasswordValidation: {
    body: updatePasswordSchema
  },
  
  // Forgot password route
  forgotPasswordValidation: {
    body: forgotPasswordSchema
  },
  
  // Reset password route
  resetPasswordValidation: {
    body: resetPasswordSchema,
    params: resetTokenParamSchema
  },
  
  // OAuth login route
  oauthLoginValidation: {
    body: oauthLoginSchema
  },
  
  // Backwards compatibility
  register: registerSchema,
  login: loginSchema,
  updateProfile: updateProfileSchema,
  updatePassword: updatePasswordSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  oauthLogin: oauthLoginSchema
}; 