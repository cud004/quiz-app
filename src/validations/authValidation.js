const Joi = require('joi');

const register = Joi.object({
  name: Joi.string().required().min(2).max(50),
  email: Joi.string().required().email(),
  password: Joi.string().required().min(6),
  role: Joi.string().valid('user', 'admin').default('user'),
  profileImage: Joi.string().uri(),
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
});

const login = Joi.object({
  email: Joi.string().required().email(),
  password: Joi.string().required()
});

const updateProfile = Joi.object({
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
});

const updatePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().required().min(6)
});

const forgotPassword = Joi.object({
  email: Joi.string().required().email()
});

const resetPassword = Joi.object({
  password: Joi.string().required().min(6)
});

module.exports = {
  register,
  login,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword
}; 