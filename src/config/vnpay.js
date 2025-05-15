/**
 * Cấu hình cho cổng thanh toán VNPay sử dụng thư viện vnpay
 */
module.exports = {
  tmnCode: process.env.VNPAY_TMN_CODE || '6TLZKQ6E',
  hashSecret: process.env.VNPAY_HASH_SECRET || 'TB0Q8XFA7J38PHMMO8HOT38K3L9QK6NM',
  vnpayHost: process.env.VNPAY_HOST || 'https://sandbox.vnpayment.vn',
  testMode: process.env.NODE_ENV !== 'production',
  hashAlgorithm: 'SHA512', // Cập nhật thành SHA512 theo tài liệu
  enableLog: process.env.NODE_ENV !== 'production',
  returnUrl: process.env.VNPAY_RETURN_URL || 'https://5214-1-52-242-144.ngrok-free.app/api/vnpay/return',
  endpoints: {
    paymentEndpoint: '/paymentv2/vpcpay.html',
    queryDrRefundEndpoint: '/merchant_webapi/api/transaction',
    getBankListEndpoint: '/qrpayauth/api/merchant/get_bank_list',
  }
};