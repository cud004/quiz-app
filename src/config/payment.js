/**
 * Cấu hình cho các cổng thanh toán
 */
module.exports = {
  // Cấu hình chung
  defaultReturnUrl: process.env.PAYMENT_RETURN_URL || 'http://localhost:5000/api/payments/callback/vnpay',
  defaultCancelUrl: process.env.PAYMENT_CANCEL_URL || 'http://localhost:5000/api/payments/cancel',
  defaultCurrency: 'VND',
  defaultLocale: 'vi',
  
  // Cấu hình VNPay
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE,
    hashSecret: process.env.VNPAY_HASH_SECRET,
    url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn',
    returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payments/callback/vnpay',
    ipnUrl: process.env.VNPAY_IPN_URL || 'http://localhost:5000/api/payments/vnpay/ipn',
    testMode: process.env.NODE_ENV !== 'production',
    hashAlgorithm: 'sha512',
    apiVersion: '2.1.0',
    currencyCode: 'VND',
    locale: 'vn',
    endpoints: {
      payment: '/paymentv2/vpcpay.html',
      query: '/merchant_webapi/api/transaction'
    }
  },
  
  // Cấu hình MoMo
  momo: {
    partnerCode: process.env.MOMO_PARTNER_CODE || 'MOMO',
    accessKey: process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85',
    secretKey: process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    url: process.env.MOMO_URL || 'https://test-payment.momo.vn/v2/gateway/api',
    returnUrl: process.env.MOMO_RETURN_URL || 'http://localhost:5000/api/payments/callback/momo',
    ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:5000/api/payments/momo/ipn',
    testMode: process.env.NODE_ENV !== 'production',
    endpoints: {
      create: '/create',
      query: '/query'
    },
    paymentUrl: process.env.MOMO_PAYMENT_URL || 'https://test-payment.momo.vn/v2/gateway/api/create',
    queryUrl: process.env.MOMO_QUERY_URL || 'https://test-payment.momo.vn/v2/gateway/api/query',
    notifyUrl: process.env.MOMO_NOTIFY_URL || 'http://localhost:5000/api/payments/momo/ipn',
    orderType: 'other',
    lang: 'vi',
    requestType: 'captureWallet'
  }
}; 