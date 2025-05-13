const { VNPay } = require('vnpay');
const vnpayConfig = require('../config/vnpay');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const subscriptionService = require('./subscriptionService');
const crypto = require('crypto');

// Khởi tạo VNPay instance
const vnpayInstance = new VNPay({
  tmnCode: vnpayConfig.tmnCode,
  secureSecret: vnpayConfig.hashSecret,
  vnpayHost: vnpayConfig.vnpayHost,
  testMode: vnpayConfig.testMode,
  hashAlgorithm: vnpayConfig.hashAlgorithm,
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
      // Đăng ký gói miễn phí ngay
      const result = await subscriptionService.subscribePackage(userId, packageId);
      return {
        success: true,
        message: 'Đăng ký gói miễn phí thành công',
        requiresPayment: false,
        subscription: result
      };
    }
    
    // Tạo mã giao dịch duy nhất
    const transactionId = `QUIZ_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    
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
    
    // Tạo URL thanh toán VNPay
    const paymentUrl = await this.createPaymentUrl(payment, packageInfo, user);
    
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
      // Chuẩn bị thông tin thanh toán
      const paymentData = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: vnpayConfig.tmnCode,
        vnp_Amount: payment.totalAmount * 100, // Nhân với 100 (VNPay tính theo đơn vị 100 đồng)
        vnp_CreateDate: new Date().toISOString().replace(/[-T:Z.]/g, '').substring(0, 14),
        vnp_CurrCode: 'VND',
        vnp_IpAddr: payment.paymentDetails.ipAddress || '127.0.0.1',
        vnp_Locale: 'vn',
        vnp_OrderInfo: `Thanh toan goi ${packageInfo.name}`,
        vnp_OrderType: 'billpayment',
        vnp_ReturnUrl: payment.paymentDetails.returnUrl || vnpayConfig.returnUrl,
        vnp_TxnRef: payment.transactionId,
        vnp_BankCode: payment.paymentDetails.bankCode || '',
      };

      // Sử dụng thư viện vnpay để tạo URL thanh toán
      const paymentUrl = await vnpayInstance.buildPaymentUrl(paymentData);
      
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
      // Kiểm tra tính hợp lệ của dữ liệu callback
      const isValidCallback = await vnpayInstance.verifyReturnUrl(vnpParams);
      
      if (!isValidCallback) {
        throw new Error('Dữ liệu callback không hợp lệ');
      }
      
      // Tìm giao dịch theo mã giao dịch
      const transactionId = vnpParams.vnp_TxnRef;
      const payment = await Payment.findOne({ transactionId });
      
      if (!payment) {
        throw new Error('Không tìm thấy giao dịch');
      }
      
      // Kiểm tra trạng thái thanh toán
      const responseCode = vnpParams.vnp_ResponseCode;
      
      // Cập nhật thông tin chi tiết giao dịch
      payment.paymentDetails = {
        ...payment.paymentDetails,
        vnpResponseCode: responseCode,
        vnpBankCode: vnpParams.vnp_BankCode,
        vnpTransactionNo: vnpParams.vnp_TransactionNo,
        vnpPayDate: vnpParams.vnp_PayDate,
        vnpOrderInfo: vnpParams.vnp_OrderInfo,
        vnpBankTranNo: vnpParams.vnp_BankTranNo
      };
      
      // Xử lý theo mã phản hồi
      if (responseCode === '00') {
        // Thanh toán thành công
        payment.status = 'completed';
        await payment.save();
        
        // Kích hoạt gói đăng ký cho người dùng
        await subscriptionService.subscribePackage(
          payment.user, 
          payment.subscription.package,
          { 
            paymentId: payment._id,
            transactionId: transactionId
          }
        );
        
        return {
          success: true,
          message: 'Thanh toán thành công',
          payment: payment
        };
      } else {
        // Thanh toán thất bại
        payment.status = 'failed';
        await payment.save();
        
        return {
          success: false,
          message: 'Thanh toán thất bại',
          errorCode: responseCode,
          payment: payment
        };
      }
    } catch (error) {
      console.error('Error processing VNPay callback:', error);
      throw new Error('Không thể xử lý callback VNPay: ' + error.message);
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
        vnp_TransactionDate: new Date().toISOString().replace(/[-T:Z.]/g, '').substring(0, 14),
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
      // Trong trường hợp lỗi, trả về danh sách mặc định
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
   * Yêu cầu hoàn tiền
   * @param {string} transactionId - Mã giao dịch gốc
   * @param {number} amount - Số tiền hoàn (mặc định là toàn bộ)
   * @param {string} reason - Lý do hoàn tiền
   * @param {string} userId - ID người dùng yêu cầu hoàn tiền
   * @returns {Object} Kết quả yêu cầu hoàn tiền
   */
  async refundTransaction(transactionId, amount, reason, userId) {
    try {
      // Tìm giao dịch gốc
      const payment = await Payment.findOne({ transactionId });
      
      if (!payment) {
        throw new Error('Không tìm thấy giao dịch');
      }
      
      // Kiểm tra người dùng có phải chủ giao dịch
      if (userId && payment.user.toString() !== userId.toString()) {
        throw new Error('Bạn không có quyền yêu cầu hoàn tiền cho giao dịch này');
      }
      
      if (payment.status !== 'completed') {
        throw new Error('Chỉ có thể hoàn tiền cho giao dịch thành công');
      }
      
      // Kiểm tra thời gian giao dịch (ví dụ: chỉ hoàn tiền trong vòng 7 ngày)
      const transactionTime = new Date(payment.transactionTime || payment.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - transactionTime);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 7) {
        throw new Error('Chỉ có thể yêu cầu hoàn tiền trong vòng 7 ngày sau khi thanh toán');
      }
      
      // Mặc định hoàn toàn bộ nếu không chỉ định số tiền
      const refundAmount = amount || payment.totalAmount;
      
      // Chuẩn bị dữ liệu hoàn tiền
      const refundData = {
        vnp_RequestId: crypto.randomBytes(8).toString('hex'),
        vnp_Version: '2.1.0',
        vnp_Command: 'refund',
        vnp_TmnCode: vnpayConfig.tmnCode,
        vnp_TransactionType: '02', // 02: hoàn trả toàn phần, 03: hoàn trả một phần
        vnp_TxnRef: transactionId,
        vnp_Amount: refundAmount * 100,
        vnp_OrderInfo: reason || `Refund transaction ${transactionId}`,
        vnp_TransactionDate: payment.paymentDetails.vnpPayDate || 
                            new Date().toISOString().replace(/[-T:Z.]/g, '').substring(0, 14),
      };
      
      // Sử dụng thư viện vnpay để yêu cầu hoàn tiền
      const result = await vnpayInstance.refund(refundData);
      
      // Nếu hoàn tiền thành công, cập nhật trạng thái giao dịch
      if (result.vnp_ResponseCode === '00') {
        payment.status = 'refunded';
        payment.paymentDetails = {
          ...payment.paymentDetails,
          refundReason: reason,
          refundRequestDate: new Date(),
          refundResponseCode: result.vnp_ResponseCode,
          refundTransactionNo: result.vnp_TransactionNo
        };
        await payment.save();
        
        // Hủy gói subscription của người dùng
        await subscriptionService.cancelSubscription(payment.user.toString());
      }
      
      return {
        success: result.vnp_ResponseCode === '00',
        message: result.vnp_ResponseCode === '00' ? 'Hoàn tiền thành công' : 'Hoàn tiền thất bại',
        payment: await Payment.findById(payment._id),
        responseCode: result.vnp_ResponseCode,
        responseData: result
      };
    } catch (error) {
      console.error('Error refunding VNPay transaction:', error);
      throw new Error('Không thể hoàn tiền giao dịch: ' + error.message);
    }
  }
};

module.exports = vnpayService; 