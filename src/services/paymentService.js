const mongoose = require('mongoose');
const Payment = require('../models/Payments');
const User = require('../models/User');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const subscriptionService = require('./subscriptionService');
const paymentConfig = require('../config/payment');
const vnpayService = require('./vnpayService');
const crypto = require('crypto');

/**
 * Service xử lý thanh toán
 */
const paymentService = {
  /**
   * Tạo phiên thanh toán mới cho gói subscription
   * @param {string} userId - ID người dùng
   * @param {string} packageId - ID gói subscription
   * @param {string} paymentMethod - Phương thức thanh toán (vnpay, momo)
   * @param {object} options - Các tùy chọn bổ sung
   * @returns {object} URL thanh toán và thông tin phiên
   */
  async createPaymentSession(userId, packageId, paymentMethod, options = {}) {
    // Kiểm tra ID người dùng hợp lệ
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('ID người dùng không hợp lệ');
    }
    
    // Kiểm tra ID gói đăng ký hợp lệ
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      throw new Error('ID gói đăng ký không hợp lệ');
    }
    
    // Kiểm tra phương thức thanh toán hợp lệ
    if (!['vnpay', 'momo'].includes(paymentMethod)) {
      throw new Error('Phương thức thanh toán không hợp lệ');
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
      paymentMethod: paymentMethod,
      transactionId: transactionId,
      status: 'pending',
      paymentDetails: {
        description: `Thanh toán gói ${packageInfo.name} - ${packageInfo.duration} tháng`,
        returnUrl: options.returnUrl || paymentConfig.defaultReturnUrl,
        ipAddress: options.ipAddress || '127.0.0.1',
        bankCode: options.bankCode || '',
        ...options
      }
    };
    
    // Lưu thông tin phiên thanh toán
    const payment = await Payment.create(paymentInfo);
    
    // Tạo URL thanh toán dựa trên phương thức
    let paymentUrl;
    
    if (paymentMethod === 'vnpay') {
      // Sử dụng vnpayService để tạo URL thanh toán
      paymentUrl = await vnpayService.createPaymentUrl(payment, packageInfo, user);
    } else if (paymentMethod === 'momo') {
      paymentUrl = await this._createMomoUrl(payment, packageInfo, user);
    }
    
    return {
      success: true,
      paymentId: payment._id,
      paymentUrl: paymentUrl,
      transactionId: transactionId,
      requiresPayment: true
    };
  },
  
  /**
   * Xử lý kết quả từ cổng thanh toán VNPay
   * @param {object} queryParams - Tham số truy vấn từ VNPay
   * @returns {object} Kết quả xử lý thanh toán
   */
  async handleVNPayReturn(queryParams) {
    // Sử dụng vnpayService để xử lý callback
    return await vnpayService.verifyReturnUrl(queryParams);
  },
  
  /**
   * Xử lý kết quả từ cổng thanh toán MoMo
   * @param {object} requestBody - Dữ liệu từ MoMo
   * @returns {object} Kết quả xử lý thanh toán
   */
  async handleMomoReturn(requestBody) {
    const { orderId, resultCode, message, amount, transId, payType } = requestBody;
    
    // Tìm giao dịch theo mã giao dịch
    const payment = await Payment.findOne({ transactionId: orderId });
    
    if (!payment) {
      throw new Error('Không tìm thấy giao dịch');
    }
    
    // Kiểm tra mã phản hồi
    if (resultCode === '0') {
      // Cập nhật trạng thái thanh toán thành công
      payment.status = 'completed';
      payment.paymentDetails = {
        ...payment.paymentDetails,
        momoTransId: transId,
        momoPayType: payType,
        momoMessage: message
      };
      await payment.save();
      
      // Đăng ký gói subscription cho người dùng
      await subscriptionService.subscribePackage(
        payment.user, 
        payment.subscription.package,
        { 
          paymentId: payment._id,
          transactionId: orderId
        }
      );
      
      return {
        success: true,
        message: 'Thanh toán thành công',
        payment: payment
      };
    } else {
      // Cập nhật trạng thái thanh toán thất bại
      payment.status = 'failed';
      payment.paymentDetails = {
        ...payment.paymentDetails,
        errorCode: resultCode,
        momoTransId: transId,
        momoPayType: payType,
        momoMessage: message
      };
      await payment.save();
      
      return {
        success: false,
        message: 'Thanh toán thất bại',
        errorCode: resultCode,
        payment: payment
      };
    }
  },
  
  /**
   * Lấy lịch sử thanh toán của người dùng
   * @param {string} userId - ID người dùng
   * @param {Object} options - Tùy chọn phân trang
   * @returns {Object} Danh sách thanh toán và thông tin phân trang
   */
  async getUserPaymentHistory(userId, options = {}) {
    // Kiểm tra ID người dùng hợp lệ
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('ID người dùng không hợp lệ');
    }
    
    // Tìm người dùng có gói đăng ký tương ứng
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;
    
    // Thực hiện truy vấn với phân trang
    const payments = await Payment.find({ user: userId })
      .populate('subscription.package')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    // Đếm tổng số thanh toán
    const total = await Payment.countDocuments({ user: userId });
    
    // Tính toán thông tin phân trang
    return {
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    };
  },
  
  /**
   * Yêu cầu hoàn tiền cho giao dịch
   * @param {string} paymentId - ID giao dịch
   * @param {string} userId - ID người dùng
   * @param {string} reason - Lý do hoàn tiền
   * @returns {Object} Kết quả yêu cầu hoàn tiền
   */
  async requestRefund(paymentId, userId, reason) {
    // Kiểm tra ID giao dịch hợp lệ
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new Error('ID giao dịch không hợp lệ');
    }
    
    // Kiểm tra ID người dùng hợp lệ
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('ID người dùng không hợp lệ');
    }
    
    // Tìm giao dịch theo ID
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      throw new Error('Không tìm thấy giao dịch');
    }
    
    // Kiểm tra người dùng có phải chủ giao dịch
    if (payment.user.toString() !== userId) {
      throw new Error('Bạn không có quyền yêu cầu hoàn tiền cho giao dịch này');
    }
    
    // Kiểm tra trạng thái giao dịch
    if (payment.status !== 'completed') {
      throw new Error('Chỉ có thể yêu cầu hoàn tiền cho giao dịch thành công');
    }
    
    // Kiểm tra thời gian giao dịch (ví dụ: chỉ hoàn tiền trong vòng 7 ngày)
    const transactionTime = new Date(payment.transactionTime);
    const now = new Date();
    const diffTime = Math.abs(now - transactionTime);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 7) {
      throw new Error('Chỉ có thể yêu cầu hoàn tiền trong vòng 7 ngày sau khi thanh toán');
    }
    
    // Xử lý hoàn tiền dựa trên phương thức thanh toán
    if (payment.paymentMethod === 'vnpay') {
      // Sử dụng vnpayService để thực hiện hoàn tiền
      const result = await vnpayService.refundTransaction(payment.transactionId, payment.totalAmount, reason);
      
      // Kiểm tra kết quả hoàn tiền
      if (result.vnp_ResponseCode === '00') {
        // Hoàn tiền thành công, đã cập nhật trạng thái trong vnpayService
        // Hủy gói subscription của người dùng
        await subscriptionService.cancelSubscription(userId);
        
        return {
          success: true,
          message: 'Hoàn tiền thành công',
          payment: await Payment.findById(paymentId) // Lấy lại payment đã cập nhật
        };
      } else {
        return {
          success: false,
          message: 'Hoàn tiền thất bại',
          errorCode: result.vnp_ResponseCode,
          payment: payment
        };
      }
    } else if (payment.paymentMethod === 'momo') {
      // Cập nhật trạng thái thanh toán chờ hoàn tiền
      payment.status = 'refunded';
      payment.paymentDetails = {
        ...payment.paymentDetails,
        refundReason: reason,
        refundRequestDate: new Date()
      };
      await payment.save();
      
      // Hủy gói subscription của người dùng
      await subscriptionService.cancelSubscription(userId);
      
      return {
        success: true,
        message: 'Yêu cầu hoàn tiền đã được ghi nhận',
        payment: payment
      };
    }
  },
  
  /**
   * Lấy thông tin giao dịch theo ID
   * @param {string} paymentId - ID giao dịch 
   * @param {string} userId - ID người dùng yêu cầu (để kiểm tra quyền)
   * @returns {Object} Thông tin giao dịch
   */
  async getPaymentById(paymentId, userId) {
    // Kiểm tra ID giao dịch hợp lệ
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new Error('ID giao dịch không hợp lệ');
    }
    
    // Tìm giao dịch theo ID
    const payment = await Payment.findById(paymentId)
      .populate('user', 'name email')
      .populate('subscription.package');
    
    if (!payment) {
      throw new Error('Không tìm thấy giao dịch');
    }
    
    // Kiểm tra người dùng có quyền xem giao dịch này không
    // Người dùng chỉ có thể xem giao dịch của họ
    if (payment.user._id.toString() !== userId) {
      // Ở đây có thể thêm kiểm tra quyền admin nếu cần
      throw new Error('Bạn không có quyền xem thông tin giao dịch này');
    }
    
    return payment;
  },
  
  /**
   * Lấy thông tin giao dịch theo mã giao dịch
   * @param {string} transactionId - Mã giao dịch
   * @returns {Object} Thông tin giao dịch
   */
  async getPaymentByTransactionId(transactionId) {
    if (!transactionId) {
      throw new Error('Mã giao dịch không được để trống');
    }
    
    // Tìm giao dịch theo mã giao dịch
    const payment = await Payment.findOne({ transactionId })
      .populate('user', 'name email')
      .populate('subscription.package');
    
    return payment;
  },
  
  // Private methods
  
  /**
   * Tạo URL thanh toán MoMo
   * @private
   */
  async _createMomoUrl(payment, packageInfo, user) {
    // Tham số mẫu cho MoMo
    const momoParams = {
      partnerCode: paymentConfig.momo.partnerCode,
      accessKey: paymentConfig.momo.accessKey,
      requestId: payment.transactionId,
      amount: payment.totalAmount.toString(),
      orderId: payment.transactionId,
      orderInfo: `Thanh toan goi ${packageInfo.name}`,
      returnUrl: payment.paymentDetails.returnUrl,
      notifyUrl: paymentConfig.momo.notifyUrl,
      extraData: Buffer.from(JSON.stringify({
        userId: user._id.toString(),
        packageId: packageInfo._id.toString()
      })).toString('base64')
    };
    
    // Trong thực tế, sẽ cần tạo mã hash an toàn từ tham số và chính xác theo quy định của MoMo
    // Đây chỉ là mô phỏng
    
    // Trả về URL mẫu
    return `${paymentConfig.momo.paymentUrl}?partnerCode=${momoParams.partnerCode}&orderId=${momoParams.orderId}&amount=${momoParams.amount}`;
  }
};

module.exports = paymentService; 