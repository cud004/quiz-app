const Joi = require('joi');

// Custom messages
const customMessages = {
  'string.empty': '{{#label}} không được để trống',
  'string.min': '{{#label}} phải có ít nhất {{#limit}} ký tự',
  'string.max': '{{#label}} không được vượt quá {{#limit}} ký tự',
  'number.min': '{{#label}} phải lớn hơn hoặc bằng {{#limit}}',
  'any.required': '{{#label}} là bắt buộc',
  'any.only': '{{#label}} chỉ được phép là một trong những giá trị: {{#valids}}',
  'string.uri': '{{#label}} phải là một URL hợp lệ'
};

// Base schema
const basePaymentSchema = Joi.object({
  packageId: Joi.string()
    .required()
    .messages(customMessages),
  paymentMethod: Joi.string()
    .valid('vnpay', 'momo')
    .required()
    .messages(customMessages),
  returnUrl: Joi.string()
    .uri()
    .messages(customMessages),
  cancelUrl: Joi.string()
    .uri()
    .messages(customMessages)
});

// VNPay schema
const vnpaySchema = Joi.object({
  bankCode: Joi.string()
    .required()
    .messages(customMessages)
});

// MoMo schema
const momoSchema = Joi.object({
  // MoMo specific fields
});

// Combined schema for payment session
const createPaymentSessionSchema = Joi.object({
  packageId: Joi.string().required().messages({
    'string.empty': 'ID gói dịch vụ không được để trống',
    'any.required': 'ID gói dịch vụ là bắt buộc'
  }),
  paymentMethod: Joi.string().valid('vnpay', 'momo').required().messages({
    'string.empty': 'Phương thức thanh toán không được để trống',
    'any.only': 'Phương thức thanh toán phải là vnpay hoặc momo',
    'any.required': 'Phương thức thanh toán là bắt buộc'
  }),
  bankCode: Joi.string().when('paymentMethod', {
    is: 'vnpay',
    then: Joi.string().required().messages({
      'string.empty': 'Mã ngân hàng không được để trống',
      'any.required': 'Mã ngân hàng là bắt buộc khi sử dụng VNPay'
    }),
    otherwise: Joi.string().optional()
  }),
  returnUrl: Joi.string().uri().optional().messages({
    'string.uri': 'URL trả về không hợp lệ'
  }),
  cancelUrl: Joi.string().uri().optional().messages({
    'string.uri': 'URL hủy không hợp lệ'
  })
});

// Schema cho VNPay response
const vnpayResponseSchema = Joi.object({
  vnp_Amount: Joi.string().required(),
  vnp_BankCode: Joi.string().required(),
  vnp_BankTranNo: Joi.string().required(),
  vnp_CardType: Joi.string().required(),
  vnp_OrderInfo: Joi.string().required(),
  vnp_PayDate: Joi.string().required(),
  vnp_ResponseCode: Joi.string().required(),
  vnp_TmnCode: Joi.string().required(),
  vnp_TransactionNo: Joi.string().required(),
  vnp_TransactionStatus: Joi.string().required(),
  vnp_TxnRef: Joi.string().required(),
  vnp_SecureHash: Joi.string().required(),
  vnp_SecureHashType: Joi.string().valid('SHA256', 'SHA512').optional()
});

// Schema cho VNPay payment request
const vnpayPaymentSchema = Joi.object({
  packageId: Joi.string().required(),
  paymentMethod: Joi.string().valid('vnpay').required(),
  bankCode: Joi.string().allow('').optional(),
  returnUrl: Joi.string().uri().required(),
  cancelUrl: Joi.string().uri().required(),
  ipAddress: Joi.string().ip().required()
});

// Schema cho VNPay IPN
const vnpayIPNSchema = Joi.object({
  vnp_Amount: Joi.string().required(),
  vnp_BankCode: Joi.string().required(),
  vnp_BankTranNo: Joi.string().required(),
  vnp_CardType: Joi.string().required(),
  vnp_OrderInfo: Joi.string().required(),
  vnp_PayDate: Joi.string().required(),
  vnp_ResponseCode: Joi.string().required(),
  vnp_TmnCode: Joi.string().required(),
  vnp_TransactionNo: Joi.string().required(),
  vnp_TransactionStatus: Joi.string().required(),
  vnp_TxnRef: Joi.string().required(),
  vnp_SecureHash: Joi.string().required(),
  vnp_SecureHashType: Joi.string().valid('SHA256', 'SHA512').required()
});

const momoResponseSchema = Joi.object({
  partnerCode: Joi.string().required(),
  orderId: Joi.string().required(),
  requestId: Joi.string().required(),
  amount: Joi.number().required(),
  orderInfo: Joi.string().required(),
  orderType: Joi.string().required(),
  transId: Joi.string().required(),
  resultCode: Joi.number().required(),
  message: Joi.string().required(),
  payUrl: Joi.string().uri().optional(),
  qrCodeUrl: Joi.string().uri().optional(),
  deeplink: Joi.string().uri().optional(),
  signature: Joi.string().required()
});

// Refund schema
const refundRequestSchema = Joi.object({
  paymentId: Joi.string()
    .required()
    .messages(customMessages),
  reason: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages(customMessages),
  amount: Joi.number()
    .min(1)
    .messages(customMessages)
}).messages(customMessages);

// Query schema
const queryTransactionSchema = Joi.object({
  transactionId: Joi.string()
    .required()
    .messages(customMessages)
}).messages(customMessages);

// Schema cho payment record
const paymentRecordSchema = Joi.object({
  user: Joi.string().required(),
  packageId: Joi.string().required(),
  amount: Joi.number().required(),
  paymentMethod: Joi.string().valid('vnpay', 'momo').required(),
  status: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED').required(),
  transactionId: Joi.string().required(),
  paymentData: Joi.object().required()
});

// Schema cho payment history query
const paymentHistoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
});

// Schema cho payment status update
const paymentStatusUpdateSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED').required(),
  message: Joi.string().optional()
});

// Hàm validate payment data
const validatePaymentData = (data) => {
  return createPaymentSessionSchema.validate(data, { abortEarly: false });
};

// Hàm validate VNPay response
const validateVNPayResponse = (data) => {
  return vnpayResponseSchema.validate(data, { abortEarly: false });
};

// Hàm validate VNPay payment request
const validateVNPayPayment = (data) => {
  return vnpayPaymentSchema.validate(data, { abortEarly: false });
};

// Hàm validate VNPay IPN
const validateVNPayIPN = (data) => {
  return vnpayIPNSchema.validate(data, { abortEarly: false });
};

// Hàm validate MoMo response
const validateMoMoResponse = (data) => {
  return momoResponseSchema.validate(data, { abortEarly: false });
};

// Hàm validate payment record
const validatePaymentRecord = (data) => {
  return paymentRecordSchema.validate(data, { abortEarly: false });
};

// Hàm validate payment history query
const validatePaymentHistoryQuery = (data) => {
  return paymentHistoryQuerySchema.validate(data, { abortEarly: false });
};

// Hàm validate payment status update
const validatePaymentStatusUpdate = (data) => {
  return paymentStatusUpdateSchema.validate(data, { abortEarly: false });
};

module.exports = {
  createPaymentSessionSchema,
  vnpayResponseSchema,
  vnpayPaymentSchema,
  vnpayIPNSchema,
  momoResponseSchema,
  refundRequestSchema,
  queryTransactionSchema,
  paymentRecordSchema,
  paymentHistoryQuerySchema,
  paymentStatusUpdateSchema,
  validatePaymentData,
  validateVNPayResponse,
  validateVNPayPayment,
  validateVNPayIPN,
  validateMoMoResponse,
  validatePaymentRecord,
  validatePaymentHistoryQuery,
  validatePaymentStatusUpdate
}; 