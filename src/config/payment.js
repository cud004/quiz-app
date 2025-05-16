/**
 * Cấu hình cho các cổng thanh toán
 */
module.exports = {
  defaultReturnUrl: process.env.PAYMENT_RETURN_URL || 'http://localhost:5000/api/payments/result',
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE || '6TLZKQ6E',
    hashSecret: process.env.VNPAY_HASH_SECRET || 'TB0Q8XFA7J38PHMMO8HOT38K3L9QK6NM',
    paymentUrl: process.env.VNPAY_HOST || 'https://sandbox.vnpayment.vn',
    apiUrl: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction'
  },
  momo: {
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
    accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
    secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    paymentUrl: process.env.MOMO_PAYMENT_URL || 'https://test-payment.momo.vn/v2/gateway/api/create',
    refundUrl: process.env.MOMO_REFUND_URL || 'https://test-payment.momo.vn/v2/gateway/api/refund',
    queryUrl: process.env.MOMO_QUERY_URL || 'https://test-payment.momo.vn/v2/gateway/api/query',
    notifyUrl: process.env.MOMO_NOTIFY_URL || 'http://localhost:5000/api/payments/momo/notify',
    returnUrl: process.env.MOMO_RETURN_URL || 'http://localhost:5000/api/payments/result'
  }
}; 