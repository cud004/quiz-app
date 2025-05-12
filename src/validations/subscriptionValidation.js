const Joi = require('joi');

// Custom messages
const customMessages = {
  'string.empty': '{{#label}} không được để trống',
  'string.min': '{{#label}} phải có ít nhất {{#limit}} ký tự',
  'string.max': '{{#label}} không được vượt quá {{#limit}} ký tự',
  'number.min': '{{#label}} phải lớn hơn hoặc bằng {{#limit}}',
  'any.required': '{{#label}} là bắt buộc',
  'any.only': '{{#label}} chỉ được phép là một trong những giá trị: {{#valids}}',
  'array.min': '{{#label}} phải có ít nhất {{#limit}} phần tử',
  'boolean.base': '{{#label}} phải là giá trị boolean (true/false)'
};

// Schema cho việc tạo gói đăng ký mới
const createPackageSchema = Joi.object({
  name: Joi.string()
    .valid('free', 'premium', 'pro')
    .required()
    .messages(customMessages),
  price: Joi.number()
    .min(0)
    .required()
    .messages(customMessages),
  duration: Joi.number()
    .min(1)
    .required()
    .messages(customMessages),
  features: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages(customMessages),
  examAccess: Joi.string()
    .valid('limited', 'unlimited')
    .required()
    .messages(customMessages),
  maxExamsPerMonth: Joi.number()
    .min(0)
    .required()
    .messages(customMessages),
  isActive: Joi.boolean()
    .default(true)
    .messages(customMessages)
});

// Schema cho việc cập nhật gói đăng ký
const updatePackageSchema = Joi.object({
  price: Joi.number()
    .min(0)
    .messages(customMessages),
  duration: Joi.number()
    .min(1)
    .messages(customMessages),
  features: Joi.array()
    .items(Joi.string())
    .min(1)
    .messages(customMessages),
  examAccess: Joi.string()
    .valid('limited', 'unlimited')
    .messages(customMessages),
  maxExamsPerMonth: Joi.number()
    .min(0)
    .messages(customMessages),
  isActive: Joi.boolean()
    .messages(customMessages)
});

// Schema cho việc đăng ký gói
const subscribeSchema = Joi.object({
  transactionId: Joi.string()
    .when('name', {
      is: Joi.string().valid('premium', 'pro'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages(customMessages)
});

// Schema cho việc bật/tắt tự động gia hạn
const autoRenewSchema = Joi.object({
  autoRenew: Joi.boolean()
    .required()
    .messages(customMessages)
});

module.exports = {
  createPackageSchema,
  updatePackageSchema,
  subscribeSchema,
  autoRenewSchema
}; 