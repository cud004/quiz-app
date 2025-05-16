/**
 * Cấu hình cho cổng thanh toán VNPay
 */
module.exports = {
  // Thông tin merchant
  tmnCode: process.env.VNPAY_TMN_CODE || '6TLZKQ6E', // Mã TMN Code, thay thế bằng mã thật khi triển khai
  hashSecret: process.env.VNPAY_HASH_SECRET || 'TB0Q8XFA7J38PHMMO8HOT38K3L9QK6NM', // Khóa bí mật, thay thế bằng khóa thật khi triển khai
  
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
  
  // URL callback
  returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payments/result',
  ipnUrl: process.env.VNPAY_IPN_URL || 'http://localhost:5000/api/payments/vnpay/ipn',
  
  // Logging
  enableLog: process.env.NODE_ENV !== 'production',
  
  // Endpoints
  endpoints: {
    payment: '/paymentv2/vpcpay.html',
    refund: '/merchant_webapi/api/transaction',
    query: '/merchant_webapi/api/transaction',
    getBanks: '/qrpayauth/api/merchant/get_bank_list'
  }
};