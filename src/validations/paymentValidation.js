const Joi = require('joi');

// Custom messages
const customMessages = {
  'string.empty': '{{#label}} không được để trống',
  'string.min': '{{#label}} phải có ít nhất {{#limit}} ký tự',
  'string.max': '{{#label}} không được vượt quá {{#limit}} ký tự',
  'number.min': '{{#label}} phải lớn hơn hoặc bằng {{#limit}}',
  'any.required': '{{#label}} là bắt buộc',
  'any.only': '{{#label}} chỉ được phép là một trong những giá trị: {{#valids}}'
};

// Schema cho việc tạo phiên thanh toán
const createPaymentSessionSchema = Joi.object({
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
  bankCode: Joi.string()
    .when('paymentMethod', {
      is: 'vnpay', 
      then: Joi.string(),
      otherwise: Joi.optional()
    })
    .messages(customMessages)
});

// Schema cho việc yêu cầu hoàn tiền
const refundRequestSchema = Joi.object({
  reason: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages(customMessages),
  amount: Joi.number()
    .min(1)
    .messages(customMessages)
});

// Schema cho việc xác nhận thanh toán từ VNPay
const vnpayResponseSchema = Joi.object({
  vnp_TmnCode: Joi.string().optional(),
  vnp_Amount: Joi.string().optional(),
  vnp_BankCode: Joi.string().optional(),
  vnp_BankTranNo: Joi.string().optional(),
  vnp_CardType: Joi.string().optional(),
  vnp_PayDate: Joi.string().optional(),
  vnp_OrderInfo: Joi.string().optional(),
  vnp_TransactionNo: Joi.string().optional(),
  vnp_ResponseCode: Joi.string().optional(),
  vnp_TransactionStatus: Joi.string().optional(),
  vnp_TxnRef: Joi.string().optional(),
  vnp_SecureHash: Joi.string().optional(),
  vnp_SecureHashType: Joi.string().optional()
}).unknown(true); // Allow additional parameters from VNPAY

// Schema cho việc xác nhận thanh toán từ MoMo
const momoResponseSchema = Joi.object({
  orderId: Joi.string()
    .required()
    .messages(customMessages),
  resultCode: Joi.string()
    .required()
    .messages(customMessages),
  amount: Joi.number()
    .required()
    .messages(customMessages),
  transId: Joi.string()
    .required()
    .messages(customMessages),
  message: Joi.string()
    .required()
    .messages(customMessages)
}).unknown(true);

module.exports = {
  createPaymentSessionSchema,
  refundRequestSchema,
  vnpayResponseSchema,
  momoResponseSchema
}; 