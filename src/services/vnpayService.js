const { VNPay, dateFormat } = require('vnpay');
const vnpayConfig = require('../config/vnpay');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const subscriptionService = require('./subscriptionService');
const crypto = require('crypto');
const qs = require('qs');
const AuthService = require('./auth/authService');

// Khởi tạo VNPay instance
const vnpayInstance = new VNPay({
  tmnCode: vnpayConfig.tmnCode,
  secureSecret: vnpayConfig.hashSecret,
  vnpayHost: vnpayConfig.vnpayHost,
  testMode: vnpayConfig.testMode,
  hashAlgorithm: vnpayConfig.hashAlgorithm, // Sử dụng sha256 từ vnpayConfig
  enableLog: vnpayConfig.enableLog,
  endpoints: vnpayConfig.endpoints
});

/**
 * Service xử lý thanh toán qua VNPay
 */
const vnpayService = {
  /**
   * Tạo phiên thanh toán mới cho VNPay
   * @param {string} userId - ID người dùng
   * @param {string} packageId - ID gói subscription
   * @param {object} options - Các tùy chọn bổ sung
   * @returns {object} URL thanh toán và thông tin phiên
   */
  async createPayment(userId, packageId, options = {}) {
    // Kiểm tra ID người dùng hợp lệ
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('ID người dùng không hợp lệ');
    }
    
    // Kiểm tra ID gói đăng ký hợp lệ
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      throw new Error('ID gói đăng ký không hợp lệ');
    }
    
    // Lấy thông tin người dùng
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }
    
    // Lấy thông tin gói đăng ký
    const packageInfo = await SubscriptionPackage.findById(packageId);
    if (!packageInfo) {
      throw new Error('Không tìm thấy gói đăng ký');
    }
    
    if (!packageInfo.isActive) {
      throw new Error('Gói đăng ký hiện không khả dụng');
    }
    
    // Kiểm tra nếu gói miễn phí thì không cần thanh toán
    if (packageInfo.price === 0 || packageInfo.name === 'free') {
      const result = await subscriptionService.subscribePackage(userId, packageId);
      return {
        success: true,
        message: 'Đăng ký gói miễn phí thành công',
        requiresPayment: false,
        subscription: result
      };
    }
    
    // Tạo mã giao dịch duy nhất
    const transactionId = `QUIZ_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
    
    // Chuẩn bị thông tin thanh toán
    const paymentInfo = {
      user: userId,
      subscription: {
        package: packageId,
        duration: packageInfo.duration,
        price: packageInfo.price
      },
      totalAmount: packageInfo.price,
      paymentMethod: 'vnpay',
      transactionId: transactionId,
      status: 'pending',
      paymentDetails: {
        description: `Thanh toán gói ${packageInfo.name} - ${packageInfo.duration} tháng`,
        returnUrl: options.returnUrl || vnpayConfig.returnUrl,
        ipAddress: options.ipAddress || '127.0.0.1',
        bankCode: options.bankCode || '',
        ...options
      }
    };
    
    // Lưu thông tin phiên thanh toán
    const payment = await Payment.create(paymentInfo);
    
    // Sử dụng thư viện VNPay để tạo URL thanh toán
    const paymentUrl = vnpayInstance.buildPaymentUrl({
      vnp_Amount: payment.totalAmount * 100, // Nhân 100 vì VNPay tính theo số tiền x 100
      vnp_IpAddr: payment.paymentDetails.ipAddress || '127.0.0.1',
      vnp_TxnRef: payment.transactionId,
      vnp_OrderInfo: `Thanh toan goi ${packageInfo.name}`,
      vnp_OrderType: 'billpayment',
      vnp_ReturnUrl: payment.paymentDetails.returnUrl || vnpayConfig.returnUrl,
      vnp_Locale: 'vn',
      vnp_CreateDate: dateFormat(new Date(), 'yyyyMMddHHmmss'), // Đảm bảo định dạng đúng
      ...(payment.paymentDetails.bankCode ? { vnp_BankCode: payment.paymentDetails.bankCode } : {})
    });
    
    console.log('VNPay payment URL created:', paymentUrl);
    
    return {
      success: true,
      paymentId: payment._id,
      paymentUrl: paymentUrl,
      transactionId: transactionId,
      requiresPayment: true
    };
  },

  /**
   * Tạo URL thanh toán VNPay
   * @param {Object} payment - Thông tin thanh toán từ database
   * @param {Object} packageInfo - Thông tin gói đăng ký
   * @param {Object} user - Thông tin người dùng
   * @returns {string} URL thanh toán VNPay
   */
  async createPaymentUrl(payment, packageInfo, user) {
    try {
      // Chuẩn hóa tham số
      const params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: vnpayConfig.tmnCode,
        vnp_Amount: Math.round(payment.totalAmount * 100),
        vnp_CreateDate: dateFormat(new Date(), 'yyyyMMddHHmmss'),
        vnp_CurrCode: 'VND',
        vnp_IpAddr: payment.paymentDetails.ipAddress || '127.0.0.1',
        vnp_Locale: 'vn',
        vnp_OrderInfo: `Thanh toan goi ${packageInfo.name}`,
        vnp_OrderType: 'billpayment',
        vnp_ReturnUrl: payment.paymentDetails.returnUrl || vnpayConfig.returnUrl,
        vnp_TxnRef: payment.transactionId,
        ...(payment.paymentDetails.bankCode ? { vnp_BankCode: payment.paymentDetails.bankCode } : {})
      };
  
      // Kiểm tra returnUrl
      if (params.vnp_ReturnUrl && params.vnp_ReturnUrl.includes('localhost')) {
        console.warn('Warning: vnp_ReturnUrl is a local URL. VNPay requires a public URL for callback. Consider using ngrok.');
      }
  
      // Debug: Tính chữ ký thủ công với SHA512
      const sortedParams = {};
      Object.keys(params)
        .filter(key => params[key] !== '' && params[key] !== undefined && params[key] !== null)
        .sort()
        .forEach(key => {
          sortedParams[key] = params[key].toString();
        });
  
      const signData = qs.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac('sha512', vnpayConfig.hashSecret);
      const calculatedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
      
      console.log('Sign data (createPaymentUrl):', signData);
      console.log('Calculated hash (createPaymentUrl, SHA512):', calculatedHash);
  
      // Sử dụng hàm buildPaymentUrl của thư viện
      const paymentUrl = vnpayInstance.buildPaymentUrl(params);
      const urlHash = paymentUrl.match(/vnp_SecureHash=([^&]+)/)?.[1];
      console.log('Library generated hash (createPaymentUrl):', urlHash);
      console.log('VNPay payment URL created:', paymentUrl);
  
      // So sánh chữ ký
      if (calculatedHash !== urlHash) {
        console.warn('Warning: Calculated hash (SHA512) does not match library generated hash. Possible misconfiguration.');
      }
  
      return paymentUrl;
    } catch (error) {
      console.error('Error creating VNPay payment URL:', error);
      throw new Error('Không thể tạo URL thanh toán VNPay: ' + error.message);
    }
  },

  /**
   * Xác thực và xử lý callback từ VNPay
   * @param {Object} vnpParams - Tham số từ VNPay gửi về
   * @returns {Object} Kết quả xử lý
   */
  async verifyReturnUrl(vnpParams) {
    try {
      console.log('VNPay callback params received:', JSON.stringify(vnpParams, null, 2));
  
      // Làm sạch tham số: chỉ giữ các tham số bắt đầu bằng vnp_
      const cleanParams = {};
      Object.keys(vnpParams)
        .filter(key => key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
        .sort()
        .forEach(key => {
          const value = vnpParams[key];
          if (value !== undefined && value !== null && value !== '') {
            cleanParams[key] = value.toString();
          }
        });
  
      // Debug chữ ký với SHA512
      const signData = qs.stringify(cleanParams, { encode: false });
      const hmac = crypto.createHmac('sha512', vnpayConfig.hashSecret);
      const calculatedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
      console.log('Sign data (verifyReturnUrl):', signData);
      console.log('Calculated hash (verifyReturnUrl, SHA512):', calculatedHash);
      console.log('Received hash (verifyReturnUrl):', vnpParams.vnp_SecureHash);
  
      // Sử dụng thư viện VNPay để xác thực chữ ký
      const isValidCallback = vnpayInstance.verifyReturnUrl(vnpParams);
  
      if (!isValidCallback) {
        console.error('VNPay signature verification failed');
        throw new Error('Dữ liệu callback không hợp lệ: Chữ ký không khớp');
      }
  
      // ... (giữ nguyên phần xử lý giao dịch sau đó)
      const transactionId = vnpParams.vnp_TxnRef;
      const payment = await Payment.findOne({ transactionId }).populate('user subscription.package');
  
      if (!payment) {
        throw new Error('Không tìm thấy giao dịch');
      }
  
      // ... (giữ nguyên phần xử lý status, subscription, email)
      return {
        success: true,
        message: 'Thanh toán thành công',
        payment
      };
    } catch (error) {
      console.error('Error verifying VNPay return:', error);
      throw error;
    }
  },

  /**
   * Truy vấn thông tin giao dịch
   * @param {string} transactionId - Mã giao dịch 
   * @returns {Object} Thông tin giao dịch từ VNPay
   */
  async queryTransaction(transactionId) {
    try {
      // Chuẩn bị dữ liệu truy vấn
      const queryData = {
        vnp_RequestId: crypto.randomBytes(8).toString('hex'),
        vnp_Version: '2.1.0',
        vnp_Command: 'querydr',
        vnp_TmnCode: vnpayConfig.tmnCode,
        vnp_TxnRef: transactionId,
        vnp_OrderInfo: `Query transaction ${transactionId}`,
        vnp_TransactionDate: dateFormat(new Date(), 'yyyyMMddHHmmss'),
      };
      
      // Sử dụng thư viện vnpay để truy vấn
      const result = await vnpayInstance.queryDr(queryData);
      
      return result;
    } catch (error) {
      console.error('Error querying VNPay transaction:', error);
      throw new Error('Không thể truy vấn thông tin giao dịch: ' + error.message);
    }
  },

  /**
   * Lấy danh sách ngân hàng hỗ trợ VNPay
   * @returns {Array} Danh sách ngân hàng
   */
  async getBankList() {
    try {
      // Sử dụng thư viện vnpay để lấy danh sách ngân hàng
      const bankList = await vnpayInstance.getBankList();
      
      // Trả về danh sách đã định dạng
      return bankList.map(bank => ({
        id: bank.bankCode,
        name: bank.bankName,
        code: bank.bankCode,
        logo: bank.bankLogo || null,
        isActive: true
      }));
    } catch (error) {
      console.error('Error getting bank list:', error);
      return [
        { id: 'NCB', name: 'Ngân hàng NCB', code: 'NCB', isActive: true },
        { id: 'VIETCOMBANK', name: 'Ngân hàng VIETCOMBANK', code: 'VIETCOMBANK', isActive: true },
        { id: 'VIETINBANK', name: 'Ngân hàng VIETINBANK', code: 'VIETINBANK', isActive: true },
        { id: 'TECHCOMBANK', name: 'Ngân hàng TECHCOMBANK', code: 'TECHCOMBANK', isActive: true },
        { id: 'BIDV', name: 'Ngân hàng BIDV', code: 'BIDV', isActive: true },
        { id: 'VPBANK', name: 'Ngân hàng VPBANK', code: 'VPBANK', isActive: true },
        { id: 'AGRIBANK', name: 'Ngân hàng AGRIBANK', code: 'AGRIBANK', isActive: true },
        { id: 'MBBANK', name: 'Ngân hàng MBBANK', code: 'MBBANK', isActive: true },
        { id: 'ACB', name: 'Ngân hàng ACB', code: 'ACB', isActive: true },
        { id: 'SHB', name: 'Ngân hàng SHB', code: 'SHB', isActive: true }
      ];
    }
  },

  /**
   * Xác thực và xử lý IPN từ VNPay
   * @param {Object} vnpParams - Tham số từ VNPay gửi về
   * @returns {Object} Kết quả xử lý
   */
  async verifyIPN(vnpParams) {
    try {
      console.log('VNPay IPN params received:', JSON.stringify(vnpParams, null, 2));
      
      // Làm sạch tham số: chỉ giữ các tham số bắt đầu bằng vnp_
      const cleanParams = {};
      Object.keys(vnpParams)
        .filter(key => key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
        .sort()
        .forEach(key => {
          cleanParams[key] = vnpParams[key];
        });
      
      // Debug chữ ký
      const signData = qs.stringify(cleanParams, { encode: false });
      const hmac = crypto.createHmac('sha256', vnpayConfig.hashSecret);
      const calculatedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
      console.log('Calculated hash:', calculatedHash);
      console.log('Received hash:', vnpParams.vnp_SecureHash);
      
      // Sử dụng thư viện VNPay để xác thực chữ ký
      const isValidIPN = vnpayInstance.verifyReturnUrl(vnpParams);
      
      if (!isValidIPN) {
        console.error('VNPay IPN signature verification failed');
        throw new Error('Dữ liệu IPN không hợp lệ: Chữ ký không khớp');
      }
      
      // Tìm giao dịch theo mã giao dịch
      const transactionId = vnpParams.vnp_TxnRef;
      const payment = await Payment.findOne({ transactionId }).populate('user subscription.package');
      
      if (!payment) {
        throw new Error('Không tìm thấy giao dịch');
      }

      // Kiểm tra nếu giao dịch đã được xử lý
      if (payment.status === 'completed') {
        return {
          success: true,
          message: 'Giao dịch đã được xử lý trước đó',
          payment
        };
      }
      
      // Kiểm tra trạng thái thanh toán
      const responseCode = vnpParams.vnp_ResponseCode;
      
      if (responseCode === '00') {
        // Cập nhật thông tin chi tiết giao dịch
        payment.status = 'completed';
        payment.paymentDetails = {
          ...payment.paymentDetails,
          vnpResponseCode: responseCode,
          vnpTransactionNo: vnpParams.vnp_TransactionNo,
          vnpBankCode: vnpParams.vnp_BankCode,
          vnpPayDate: vnpParams.vnp_PayDate,
          vnpSecureHash: vnpParams.vnp_SecureHash,
          completedAt: new Date()
        };
        await payment.save();

        // Kích hoạt gói đăng ký
        try {
          await subscriptionService.subscribePackage(
            payment.user._id,
            payment.subscription.package._id,
            {
              transactionId: transactionId,
              amount: payment.totalAmount
            }
          );
        } catch (error) {
          console.error('Error processing subscription:', error);
          payment.paymentDetails.error = error.message;
          await payment.save();
          throw error;
        }

        return {
          success: true,
          message: 'Thanh toán thành công',
          payment
        };
      } else {
        // Cập nhật trạng thái thanh toán thất bại
        payment.status = 'failed';
        payment.paymentDetails = {
          ...payment.paymentDetails,
          vnpResponseCode: responseCode,
          vnpMessage: vnpParams.vnp_Message,
          failedAt: new Date()
        };
        await payment.save();

        return {
          success: false,
          message: 'Thanh toán thất bại',
          errorCode: responseCode,
          payment
        };
      }
    } catch (error) {
      console.error('Error verifying VNPay IPN:', error);
      throw error;
    }
  }
};

module.exports = vnpayService;