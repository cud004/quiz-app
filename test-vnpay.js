require('dotenv').config();
const { VNPay, dateFormat } = require('vnpay');

const vnpay = new VNPay({
  tmnCode: process.env.VNPAY_TMN_CODE,
  secureSecret: process.env.VNPAY_HASH_SECRET,
  vnpayHost: process.env.VNPAY_URL,
  testMode: true,
  hashAlgorithm: 'sha512'
});

const buildParams = {
  vnp_Amount: 10000,
  vnp_IpAddr: '127.0.0.1',
  vnp_TxnRef: 'test123456',
  vnp_OrderInfo: 'Test order',
  vnp_ReturnUrl: process.env.VNPAY_RETURN_URL,
  vnp_OrderType: 'other',
  vnp_Locale: 'vn',
  vnp_Version: '2.1.0',
  vnp_CreateDate: dateFormat(new Date(), 'yyyyMMddHHmmss'),
  vnp_ExpireDate: dateFormat(new Date(Date.now() + 15 * 60 * 1000), 'yyyyMMddHHmmss')
};

console.log('buildParams:', buildParams);

try {
  const url = vnpay.buildPaymentUrl(buildParams);
  console.log('Payment URL:', url);
} catch (e) {
  console.error('Error:', e);
}