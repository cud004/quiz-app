/**
 * Cấu hình cho cổng thanh toán VNPay sử dụng thư viện vnpay
 */
module.exports = {
  // Cấu hình chung
  tmnCode: process.env.VNPAY_TMN_CODE || 'YOUR_VNPAY_TMN_CODE',
  secureSecret: process.env.VNPAY_HASH_SECRET || 'YOUR_VNPAY_HASH_SECRET',
  vnpayHost: process.env.VNPAY_HOST || 'https://sandbox.vnpayment.vn',
  
  // Cấu hình tùy chọn
  testMode: process.env.NODE_ENV !== 'production',
  hashAlgorithm: 'SHA512',
  enableLog: process.env.NODE_ENV !== 'production',
  
  // URL callback
  returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/payments/vnpay-return',
  
  // Endpoints
  endpoints: {
    paymentEndpoint: 'paymentv2/vpcpay.html',
    queryDrRefundEndpoint: 'merchant_webapi/api/transaction',
    getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list',
  }
}; 