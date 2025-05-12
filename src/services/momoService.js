const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const subscriptionService = require('./subscriptionService');
const paymentConfig = require('../config/payment');

/**
 * Service xử lý thanh toán qua MoMo
 */
const momoService = {
  /**
   * Tạo phiên thanh toán mới cho gói subscription qua MoMo
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
      paymentMethod: 'momo',
      transactionId: transactionId,
      status: 'pending',
      paymentDetails: {
        description: `Thanh toán gói ${packageInfo.name} - ${packageInfo.duration} tháng`,
        returnUrl: options.returnUrl || paymentConfig.defaultReturnUrl,
        ipAddress: options.ipAddress || '127.0.0.1',
        ...options
      }
    };
    
    // Lưu thông tin phiên thanh toán
    const payment = await Payment.create(paymentInfo);
    
    // Tạo URL thanh toán MoMo
    const paymentUrl = await this._createMomoPaymentUrl(payment, packageInfo, user);
    
    return {
      success: true,
      paymentId: payment._id,
      paymentUrl: paymentUrl,
      transactionId: transactionId,
      requiresPayment: true
    };
  },
  
  /**
   * Xử lý kết quả từ cổng thanh toán MoMo
   * @param {object} requestBody - Dữ liệu từ MoMo
   * @returns {object} Kết quả xử lý thanh toán
   */
  async handleMomoReturn(requestBody) {
    try {
      const { orderId, resultCode, message, amount, transId, payType, extraData, signature } = requestBody;
      
      // Tìm giao dịch theo mã giao dịch
      const payment = await Payment.findOne({ transactionId: orderId });
      
      if (!payment) {
        throw new Error('Không tìm thấy giao dịch');
      }
      
      // Xác thực chữ ký
      const isValidSignature = this._verifyMomoSignature(requestBody);
      if (!isValidSignature) {
        throw new Error('Chữ ký không hợp lệ');
      }
      
      // Kiểm tra mã phản hồi
      if (resultCode === '0') {
        // Cập nhật trạng thái thanh toán thành công
        payment.status = 'completed';
        payment.paymentDetails = {
          ...payment.paymentDetails,
          momoTransId: transId,
          momoPayType: payType,
          momoMessage: message,
          momoExtraData: extraData
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
          momoMessage: message,
          momoExtraData: extraData
        };
        await payment.save();
        
        return {
          success: false,
          message: 'Thanh toán thất bại',
          errorCode: resultCode,
          payment: payment
        };
      }
    } catch (error) {
      console.error('Error handling MoMo return:', error);
      throw error;
    }
  },
  
  /**
   * Yêu cầu hoàn tiền cho giao dịch MoMo
   * @param {string} paymentId - ID giao dịch
   * @param {string} userId - ID người dùng
   * @param {string} reason - Lý do hoàn tiền
   * @returns {Object} Kết quả yêu cầu hoàn tiền
   */
  async requestRefund(paymentId, userId, reason) {
    try {
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
      const transactionTime = new Date(payment.transactionTime || payment.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - transactionTime);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 7) {
        throw new Error('Chỉ có thể yêu cầu hoàn tiền trong vòng 7 ngày sau khi thanh toán');
      }
      
      // Thực hiện yêu cầu hoàn tiền đến MoMo
      const refundResult = await this._createMomoRefund(payment, reason);
      
      if (refundResult.resultCode === '0') {
        // Cập nhật trạng thái thanh toán
        payment.status = 'refunded';
        payment.paymentDetails = {
          ...payment.paymentDetails,
          refundReason: reason,
          refundRequestDate: new Date(),
          refundTransId: refundResult.transId,
          refundResultCode: refundResult.resultCode
        };
        await payment.save();
        
        // Hủy gói subscription của người dùng
        await subscriptionService.cancelSubscription(userId);
        
        return {
          success: true,
          message: 'Hoàn tiền thành công',
          payment: payment
        };
      } else {
        return {
          success: false,
          message: 'Hoàn tiền thất bại',
          errorCode: refundResult.resultCode,
          payment: payment
        };
      }
    } catch (error) {
      console.error('Error requesting MoMo refund:', error);
      throw error;
    }
  },
  
  /**
   * Truy vấn thông tin giao dịch MoMo
   * @param {string} transactionId - Mã giao dịch
   * @returns {Object} Thông tin giao dịch từ MoMo
   */
  async queryTransaction(transactionId) {
    try {
      // Tìm giao dịch trong hệ thống
      const payment = await Payment.findOne({ transactionId });
      
      if (!payment) {
        throw new Error('Không tìm thấy giao dịch');
      }
      
      // Khởi tạo tham số truy vấn
      const requestId = `QUERY_${Date.now()}`;
      const partnerCode = paymentConfig.momo.partnerCode;
      const orderId = transactionId;
      const requestType = 'transactionStatus';
      const signature = this._createMomoSignature({
        partnerCode,
        requestId,
        orderId,
        requestType
      });
      
      // Gửi yêu cầu truy vấn đến MoMo
      const response = await axios.post(
        paymentConfig.momo.queryUrl,
        {
          partnerCode,
          requestId,
          orderId,
          requestType,
          signature
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Trả về kết quả
      return {
        ...response.data,
        payment
      };
    } catch (error) {
      console.error('Error querying MoMo transaction:', error);
      throw error;
    }
  },
  
  // Private methods
  
  /**
   * Tạo URL thanh toán MoMo
   * @private
   * @param {Object} payment - Thông tin thanh toán từ database
   * @param {Object} packageInfo - Thông tin gói đăng ký
   * @param {Object} user - Thông tin người dùng
   * @returns {string} URL thanh toán MoMo
   */
  async _createMomoPaymentUrl(payment, packageInfo, user) {
    try {
      const partnerCode = paymentConfig.momo.partnerCode;
      const accessKey = paymentConfig.momo.accessKey;
      const secretKey = paymentConfig.momo.secretKey;
      const requestId = payment.transactionId;
      const orderId = payment.transactionId;
      const amount = payment.totalAmount.toString();
      const orderInfo = `Thanh toan goi ${packageInfo.name}`;
      const returnUrl = payment.paymentDetails.returnUrl;
      const notifyUrl = paymentConfig.momo.notifyUrl;
      const extraData = Buffer.from(JSON.stringify({
        userId: user._id.toString(),
        packageId: packageInfo._id.toString()
      })).toString('base64');
      
      // Tạo chữ ký
      const rawSignature = `partnerCode=${partnerCode}&accessKey=${accessKey}&requestId=${requestId}&amount=${amount}&orderId=${orderId}&orderInfo=${orderInfo}&returnUrl=${returnUrl}&notifyUrl=${notifyUrl}&extraData=${extraData}`;
      const signature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
      
      // Chuẩn bị dữ liệu gửi tới MoMo
      const requestBody = {
        partnerCode,
        accessKey,
        requestId,
        amount,
        orderId,
        orderInfo,
        returnUrl,
        notifyUrl,
        extraData,
        requestType: 'captureMoMoWallet',
        signature
      };
      
      // Gọi API MoMo để tạo URL thanh toán
      const response = await axios.post(
        paymentConfig.momo.paymentUrl,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Lưu thông tin chi tiết vào payment
      payment.paymentDetails = {
        ...payment.paymentDetails,
        momoRequestId: requestId,
        momoSignature: signature
      };
      await payment.save();
      
      // Trả về URL thanh toán
      return response.data.payUrl;
    } catch (error) {
      console.error('Error creating MoMo payment URL:', error);
      throw new Error('Không thể tạo URL thanh toán MoMo: ' + error.message);
    }
  },
  
  /**
   * Xác thực chữ ký từ MoMo
   * @private
   * @param {Object} requestBody - Dữ liệu nhận từ MoMo
   * @returns {boolean} Kết quả xác thực
   */
  _verifyMomoSignature(requestBody) {
    try {
      const {
        partnerCode,
        accessKey,
        requestId,
        amount,
        orderId,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature
      } = requestBody;
      
      // Tạo chuỗi raw signature từ dữ liệu nhận được
      const rawSignature = `partnerCode=${partnerCode}&accessKey=${accessKey}&requestId=${requestId}&amount=${amount}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&transId=${transId}&resultCode=${resultCode}&message=${message}&responseTime=${responseTime}&extraData=${extraData || ''}&payType=${payType || ''}`;
      
      // Tạo chữ ký để so sánh
      const computedSignature = crypto.createHmac('sha256', paymentConfig.momo.secretKey)
        .update(rawSignature)
        .digest('hex');
      
      // So sánh chữ ký
      return computedSignature === signature;
    } catch (error) {
      console.error('Error verifying MoMo signature:', error);
      return false;
    }
  },
  
  /**
   * Tạo yêu cầu hoàn tiền đến MoMo
   * @private
   * @param {Object} payment - Thông tin thanh toán
   * @param {string} reason - Lý do hoàn tiền
   * @returns {Object} Kết quả từ MoMo
   */
  async _createMomoRefund(payment, reason) {
    try {
      const requestId = `REFUND_${Date.now()}`;
      const partnerCode = paymentConfig.momo.partnerCode;
      const amount = payment.totalAmount.toString();
      const orderId = payment.transactionId;
      const transId = payment.paymentDetails.momoTransId;
      const description = reason || `Hoàn tiền giao dịch ${orderId}`;
      
      // Tạo chữ ký
      const rawSignature = `partnerCode=${partnerCode}&accessKey=${paymentConfig.momo.accessKey}&requestId=${requestId}&amount=${amount}&orderId=${orderId}&transId=${transId}&description=${description}`;
      const signature = crypto.createHmac('sha256', paymentConfig.momo.secretKey)
        .update(rawSignature)
        .digest('hex');
      
      // Chuẩn bị dữ liệu gửi tới MoMo
      const requestBody = {
        partnerCode,
        accessKey: paymentConfig.momo.accessKey,
        requestId,
        amount,
        orderId,
        transId,
        description,
        signature
      };
      
      // Gọi API MoMo để hoàn tiền
      const response = await axios.post(
        paymentConfig.momo.refundUrl,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error creating MoMo refund:', error);
      throw new Error('Không thể tạo yêu cầu hoàn tiền MoMo: ' + error.message);
    }
  },
  
  /**
   * Tạo chữ ký cho các yêu cầu MoMo
   * @private
   * @param {Object} params - Các tham số cần tạo chữ ký
   * @returns {string} Chữ ký đã tạo
   */
  _createMomoSignature(params) {
    try {
      const secretKey = paymentConfig.momo.secretKey;
      
      // Sắp xếp các tham số theo thứ tự alphabet
      const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});
      
      // Tạo chuỗi raw signature
      const rawSignature = Object.entries(sortedParams)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      
      // Tạo chữ ký
      return crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
    } catch (error) {
      console.error('Error creating MoMo signature:', error);
      throw new Error('Không thể tạo chữ ký MoMo: ' + error.message);
    }
  }
};

module.exports = momoService; 