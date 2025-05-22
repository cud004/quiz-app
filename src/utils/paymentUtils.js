/**
 * Các tiện ích xử lý cho thanh toán
 */

const crypto = require('crypto');
const paymentConfig = require('../config/payment');

/**
 * Tính toán số tiền cho gateway
 * @param {number} amount - Số tiền gốc (đơn vị: VND)
 * @param {string} gateway - Cổng thanh toán (vnpay, momo)
 * @returns {number} Số tiền đã được điều chỉnh
 */
function calculateGatewayAmount(amount, gateway) {
  const baseAmount = Math.round(amount);
  switch (gateway) {
    case 'vnpay':
      // KHÔNG nhân 100 với vnpay.js.org
      return baseAmount;
    case 'momo':
      return baseAmount;
    default:
      return baseAmount;
  }
}

/**
 * Format tiền tệ
 * @param {number} amount - Số tiền cần định dạng
 * @param {string} currency - Mã tiền tệ (mặc định: VND)
 * @returns {string} Số tiền đã được định dạng
 */
function formatCurrency(amount, currency = 'VND') {
  const formatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency
  });
  return formatter.format(amount);
}

/**
 * Tạo mã giao dịch duy nhất
 * @param {string} prefix - Prefix cho mã giao dịch (VD: VNPAY, MOMO)
 * @returns {string} Mã giao dịch
 */
function generateTransactionId(prefix = 'QUIZ') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Chuẩn hóa response từ gateway
 * @param {Object} response - Response từ gateway
 * @param {string} gateway - Tên gateway (vnpay, momo)
 * @returns {Object} Response đã được chuẩn hóa
 */
function normalizeGatewayResponse(response, gateway) {
  switch (gateway) {
    case 'vnpay':
      return {
        success: response.vnp_ResponseCode === '00',
        transactionId: response.vnp_TxnRef,
        amount: parseInt(response.vnp_Amount) / 100,
        bankCode: response.vnp_BankCode,
        bankTranNo: response.vnp_BankTranNo,
        cardType: response.vnp_CardType,
        payDate: response.vnp_PayDate,
        orderInfo: response.vnp_OrderInfo,
        responseCode: response.vnp_ResponseCode,
        message: response.vnp_Message || 'Thanh toán thành công'
      };
    case 'momo':
      return {
        success: response.resultCode === 0,
        transactionId: response.orderId,
        amount: response.amount,
        transId: response.transId,
        payType: response.payType,
        responseCode: response.resultCode,
        message: response.message || 'Thanh toán thành công'
      };
    default:
      return response;
  }
}

/**
 * Chuẩn hóa error từ gateway
 * @param {Error} error - Error từ gateway
 * @param {string} gateway - Tên gateway (vnpay, momo)
 * @returns {Object} Error đã được chuẩn hóa
 */
function normalizeGatewayError(error, gateway) {
  const baseError = {
    code: `${gateway.toUpperCase()}_ERROR`,
    message: error.message || 'Lỗi không xác định',
    details: error.details || {}
  };

  switch (gateway) {
    case 'vnpay':
      return {
        ...baseError,
        code: `VNPAY_${error.code || 'UNKNOWN_ERROR'}`,
        details: {
          ...baseError.details,
          responseCode: error.responseCode,
          bankCode: error.bankCode
        }
      };
    case 'momo':
      return {
        ...baseError,
        code: `MOMO_${error.code || 'UNKNOWN_ERROR'}`,
        details: {
          ...baseError.details,
          resultCode: error.resultCode,
          payType: error.payType
        }
      };
    default:
      return baseError;
  }
}

/**
 * Validate payment data
 * @param {Object} data - Data cần validate
 * @param {string} gateway - Tên gateway (vnpay, momo)
 * @returns {boolean} Kết quả validate
 */
function validatePaymentData(data, gateway) {
  const requiredFields = {
    vnpay: ['tmnCode', 'hashSecret', 'url'],
    momo: ['partnerCode', 'accessKey', 'secretKey', 'url']
  };

  const fields = requiredFields[gateway] || [];
  return fields.every(field => {
    const value = paymentConfig[gateway][field];
    return value && typeof value === 'string' && value.length > 0;
  });
}

/**
 * Validate dữ liệu cấu hình payment
 * @param {Object} config - Cấu hình payment
 * @param {string} gateway - Tên gateway (vnpay, momo)
 * @returns {boolean} Kết quả validation
 */
const validatePaymentConfig = (config, gateway) => {
  if (!config || !gateway) return false;

  const requiredFields = {
    vnpay: ['tmnCode', 'hashSecret', 'url', 'returnUrl'],
    momo: ['partnerCode', 'accessKey', 'secretKey', 'url', 'returnUrl']
  };

  const fields = requiredFields[gateway.toLowerCase()];
  if (!fields) return false;

  return fields.every(field => config[field]);
};

/**
 * Tạo URL thanh toán
 * @param {Object} data - Dữ liệu thanh toán
 * @param {string} gateway - Tên gateway
 * @returns {string} URL thanh toán
 */
const createPaymentUrl = (data, gateway) => {
  const config = paymentConfig[gateway.toLowerCase()];
  if (!config || !validatePaymentConfig(config, gateway)) {
    throw new Error(`Cấu hình ${gateway} không hợp lệ`);
  }

  const baseUrl = config.url;
  const endpoint = config.endpoints.payment;
  const queryString = new URLSearchParams(data).toString();

  return `${baseUrl}${endpoint}?${queryString}`;
};

/**
 * Tạo chữ ký cho request
 * @param {Object} data - Dữ liệu cần ký
 * @param {string} gateway - Tên gateway
 * @returns {string} Chữ ký
 */
const createSignature = (data, gateway) => {
  const config = paymentConfig[gateway.toLowerCase()];
  if (!config || !validatePaymentConfig(config, gateway)) {
    throw new Error(`Cấu hình ${gateway} không hợp lệ`);
  }

  // Sắp xếp data theo key
  const sortedData = Object.keys(data)
    .sort()
    .reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {});

  // Tạo chuỗi cần ký
  const signData = Object.entries(sortedData)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  // Tạo chữ ký
  const hmac = crypto.createHmac(config.hashAlgorithm || 'sha256', config.hashSecret);
  return hmac.update(signData).digest('hex');
};

/**
 * Tạo chữ ký cho VNPay
 * @param {Object} data - Dữ liệu cần ký
 * @returns {string} Chữ ký
 */
function createVNPaySignature(data) {
  const config = paymentConfig.vnpay;
  if (!validatePaymentData(data, 'vnpay')) {
    throw new Error('Cấu hình VNPay không hợp lệ');
  }

  // Sắp xếp data theo key
  const sortedData = Object.keys(data)
    .sort()
    .reduce((acc, key) => {
      acc[key] = data[key];
      return acc;
    }, {});

  // Tạo chuỗi cần ký (KHÔNG encode value)
  const signData = Object.entries(sortedData)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // Tạo chữ ký
  const hmac = crypto.createHmac('sha512', config.hashSecret);
  return hmac.update(signData).digest('hex');
}

/**
 * Tạo chữ ký cho MoMo
 * @param {Object} data - Dữ liệu cần ký
 * @returns {string} Chữ ký
 */
function createMoMoSignature(data) {
  const config = paymentConfig.momo;
  if (!validatePaymentData(data, 'momo')) {
    throw new Error('Cấu hình MoMo không hợp lệ');
  }

  // Tạo chuỗi cần ký
  const signData = `partnerCode=${data.partnerCode}&accessKey=${data.accessKey}&requestId=${data.requestId}&amount=${data.amount}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&orderType=${data.orderType}&transId=${data.transId}&message=${data.message}&localMessage=${data.localMessage}&responseTime=${data.responseTime}&errorCode=${data.errorCode}&payType=${data.payType}&extraData=${data.extraData}`;

  // Tạo chữ ký
  const hmac = crypto.createHmac('sha256', config.secretKey);
  return hmac.update(signData).digest('hex');
}

/**
 * Tạo URL thanh toán cho VNPay
 * @param {Object} data - Dữ liệu thanh toán
 * @returns {string} URL thanh toán
 */
function createVNPayUrl(data) {
  const config = paymentConfig.vnpay;
  if (!validatePaymentData(data, 'vnpay')) {
    throw new Error('Cấu hình VNPay không hợp lệ');
  }

  // Thêm các thông tin bắt buộc
  const paymentData = {
    ...data,
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_CurrCode: 'VND',
    vnp_Locale: 'vn',
    vnp_IpAddr: data.ipAddr || '127.0.0.1',
    vnp_CreateDate: new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  };

  // Tạo chữ ký
  paymentData.vnp_SecureHash = createVNPaySignature(paymentData);

  // Tạo URL
  const queryString = new URLSearchParams(paymentData).toString();
  return `${config.url}?${queryString}`;
}

/**
 * Tạo URL thanh toán cho MoMo
 * @param {Object} data - Dữ liệu thanh toán
 * @returns {string} URL thanh toán
 */
function createMoMoUrl(data) {
  const config = paymentConfig.momo;
  if (!validatePaymentData(data, 'momo')) {
    throw new Error('Cấu hình MoMo không hợp lệ');
  }

  // Thêm các thông tin bắt buộc
  const paymentData = {
    ...data,
    partnerCode: config.partnerCode,
    accessKey: config.accessKey,
    requestType: 'captureWallet',
    ipnUrl: config.ipnUrl,
    redirectUrl: config.redirectUrl,
    orderType: 'other',
    lang: 'vi'
  };

  // Tạo chữ ký
  paymentData.signature = createMoMoSignature(paymentData);

  // Tạo URL
  const queryString = new URLSearchParams(paymentData).toString();
  return `${config.url}?${queryString}`;
}

module.exports = {
  calculateGatewayAmount,
  formatCurrency,
  generateTransactionId,
  normalizeGatewayResponse,
  normalizeGatewayError,
  validatePaymentData,
  validatePaymentConfig,
  createPaymentUrl,
  createSignature,
  createVNPaySignature,
  createMoMoSignature,
  createVNPayUrl,
  createMoMoUrl
}; 