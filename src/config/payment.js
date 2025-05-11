/**
 * Cấu hình cho các cổng thanh toán
 */
module.exports = {
  defaultReturnUrl: process.env.PAYMENT_RETURN_URL || 'http://localhost:3000/payment/result',
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE || 'YOUR_VNPAY_TMN_CODE',
    hashSecret: process.env.VNPAY_HASH_SECRET || 'YOUR_VNPAY_HASH_SECRET',
    paymentUrl: process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    apiUrl: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'
  },
  momo: {
    partnerCode: process.env.MOMO_PARTNER_CODE || 'YOUR_MOMO_PARTNER_CODE',
    accessKey: process.env.MOMO_ACCESS_KEY || 'YOUR_MOMO_ACCESS_KEY',
    secretKey: process.env.MOMO_SECRET_KEY || 'YOUR_MOMO_SECRET_KEY',
    paymentUrl: process.env.MOMO_PAYMENT_URL || 'https://test-payment.momo.vn/v2/gateway/api/create',
    refundUrl: process.env.MOMO_REFUND_URL || 'https://test-payment.momo.vn/v2/gateway/api/refund',
    queryUrl: process.env.MOMO_QUERY_URL || 'https://test-payment.momo.vn/v2/gateway/api/query',
    notifyUrl: process.env.MOMO_NOTIFY_URL || 'http://localhost:3000/api/payments/momo-notify'
  }
}; 