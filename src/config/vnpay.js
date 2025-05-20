/**
 * Cấu hình cho cổng thanh toán VNPay
 */
module.exports = {
  // Thông tin merchant
  tmnCode: process.env.VNPAY_TMN_CODE,
  hashSecret: process.env.VNPAY_HASH_SECRET,
  
  // Môi trường
  vnpayHost: process.env.NODE_ENV === 'production' 
    ? 'https://pay.vnpay.vn'
    : 'https://sandbox.vnpayment.vn',
  testMode: process.env.NODE_ENV !== 'production',
  
  // Cấu hình kỹ thuật
  hashAlgorithm: 'sha512',
  apiVersion: '2.1.0',
  locale: 'vn',
  currencyCode: 'VND',
  
  // URL callback - Sử dụng domain thật trong production
  returnUrl: process.env.NODE_ENV === 'production'
    ? `${process.env.API_DOMAIN}/api/payments/vnpay/callback`
    : 'http://localhost:5000/api/payments/vnpay/callback',
  ipnUrl: process.env.NODE_ENV === 'production'
    ? `${process.env.API_DOMAIN}/api/payments/vnpay/ipn`
    : 'http://localhost:5000/api/payments/vnpay/ipn',
  
  // Cấu hình bảo mật
  timeout: 15000, // 15 giây
  maxRetries: 3,
  retryDelay: 1000, // 1 giây
  
  // Logging
  enableLog: true,
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  
  // Endpoints
  endpoints: {
    payment: '/paymentv2/vpcpay.html',
    refund: '/merchant_webapi/api/transaction',
    query: '/merchant_webapi/api/transaction',
    getBanks: '/qrpayauth/api/merchant/get_bank_list'
  }
};