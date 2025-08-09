const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const subscriptionService = require('./subscriptionService');
const { calculateGatewayAmount } = require('../utils/paymentUtils');
const paymentConfig = require('../config/payment');
const AuthService = require('./authService');


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
      status: 'PENDING',
      paymentDetails: {
        description: `Thanh toán gói ${packageInfo.name} - ${packageInfo.duration} tháng`,
        returnUrl: options.returnUrl || paymentConfig.defaultReturnUrl,
        ipAddress: options.ipAddress || '127.0.0.1',
        ...options
      },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    };
    
    // Lưu thông tin phiên thanh toán
    const payment = await Payment.create(paymentInfo);
    
    // Tạo URL thanh toán MoMo
    const paymentUrl = await this._createMomoPaymentUrl(payment, packageInfo, user);
    
    console.log('MoMo payment URL created:', paymentUrl);
    
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
      console.log('[MoMoService] Callback Data:', JSON.stringify(requestBody, null, 2));
      
      const { orderId, resultCode, message, amount, transId, payType, extraData } = requestBody;
      
      // Tìm giao dịch theo mã giao dịch
      const payment = await Payment.findOne({ transactionId: orderId }).populate('user subscription.package');
      
      if (!payment) {
        console.error('[MoMoService] Payment not found:', orderId);
        throw new Error('Không tìm thấy giao dịch');
      }

      console.log('[MoMoService] Found payment:', {
        transactionId: payment.transactionId,
        status: payment.status,
        amount: payment.totalAmount
      });

      // Kiểm tra nếu giao dịch đã được xử lý
      if (payment.status === 'SUCCESS') {
        console.log('[MoMoService] Payment already processed:', orderId);
        return {
          success: true,
          message: 'Giao dịch đã được xử lý trước đó',
          payment
        };
      }
      
      // Xác thực chữ ký
      const isValidSignature = this._verifyMomoSignature(requestBody);
      if (!isValidSignature) {
        console.error('[MoMoService] Invalid signature for transaction:', orderId);
        throw new Error('Chữ ký không hợp lệ');
      }
      
      // Kiểm tra mã phản hồi
      if (resultCode === 0 || resultCode === '0') {
        console.log('[MoMoService] Payment successful, updating status');
        
        // Cập nhật trạng thái thanh toán thành công
        payment.status = 'SUCCESS';
        payment.paymentDetails = {
          ...payment.paymentDetails,
          momoTransId: transId,
          momoPayType: payType,
          momoMessage: message,
          momoExtraData: extraData,
          momoResultCode: resultCode,
          completedAt: new Date()
        };
        await payment.save();
        
        console.log('[MoMoService] Payment status updated:', {
          transactionId: payment.transactionId,
          status: payment.status
        });
        
        // Giải mã extraData để lấy thông tin bổ sung (nếu có)
        let decodedExtraData = {};
        try {
          if (extraData) {
            const extraDataString = Buffer.from(extraData, 'base64').toString();
            decodedExtraData = JSON.parse(extraDataString);
            console.log('[MoMoService] Decoded extraData:', decodedExtraData);
          }
        } catch (error) {
          console.warn('[MoMoService] Could not decode extraData:', error.message);
        }
        
        // Kích hoạt gói đăng ký
        try {
          console.log('[MoMoService] Activating subscription');
          await subscriptionService.subscribePackage(
            payment.user._id,
            payment.subscription.package._id,
            { 
              transactionId: orderId,
              amount: payment.totalAmount,
              extraData: decodedExtraData
            }
          );
          console.log('[MoMoService] Subscription activated successfully');

          // Gửi email thông báo
          await AuthService.sendEmail({
            to: payment.user.email,
            subject: 'Thanh toán MoMo thành công',
            template: 'payment-success',
            context: {
              name: payment.user.name,
              packageName: payment.subscription.package.name,
              amount: payment.totalAmount.toLocaleString('vi-VN') + ' VNĐ',
              transactionId: orderId,
              paymentMethod: 'MoMo'
            }
          });
          console.log('[MoMoService] Success email sent');
        } catch (error) {
          console.error('[MoMoService] Error processing subscription:', error);
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
        console.log('[MoMoService] Payment failed:', {
          transactionId: orderId,
          resultCode,
          message
        });
        
        // Cập nhật trạng thái thanh toán thất bại
        payment.status = 'FAILED';
        payment.paymentDetails = {
          ...payment.paymentDetails,
          errorCode: resultCode,
          momoTransId: transId,
          momoPayType: payType,
          momoMessage: message,
          momoExtraData: extraData,
          failedAt: new Date()
        };
        await payment.save();
        
        // Gửi email thông báo
        try {
          await AuthService.sendEmail({
            to: payment.user.email,
            subject: 'Thanh toán MoMo thất bại',
            template: 'payment-failed',
            context: {
              name: payment.user.name,
              packageName: payment.subscription.package.name,
              amount: payment.totalAmount.toLocaleString('vi-VN') + ' VNĐ',
              transactionId: orderId,
              reason: message || 'Mã lỗi: ' + resultCode
            }
          });
          console.log('[MoMoService] Failure email sent');
        } catch (emailError) {
          console.error('[MoMoService] Error sending payment failed email:', emailError);
        }
        
        return {
          success: false,
          message: 'Thanh toán thất bại',
          errorCode: resultCode,
          payment
        };
      }
    } catch (error) {
      console.error('[MoMoService] Error handling MoMo return:', error);
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
      const partnerCode = paymentConfig.momo.partnerCode;
      const accessKey = paymentConfig.momo.accessKey;
      const secretKey = paymentConfig.momo.secretKey;
      const requestId = `QUERY_${Date.now()}`;
      const orderId = transactionId;
      
      // Tạo chuỗi raw signature theo chuẩn MoMo mới
      const rawSignature = "accessKey=" + accessKey +
        "&orderId=" + orderId +
        "&partnerCode=" + partnerCode +
        "&requestId=" + requestId;
      
      // Tạo chữ ký
      const signature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
      
      // Chuẩn bị dữ liệu gửi tới MoMo
      const requestBody = {
        partnerCode,
        accessKey,
        requestId,
        orderId,
        lang: 'vi',
        signature
      };
      
      console.log('MoMo Query Request:', JSON.stringify(requestBody, null, 2));
      
      // Gửi yêu cầu truy vấn đến MoMo
      const response = await axios.post(
        paymentConfig.momo.queryUrl,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('MoMo Query Response:', JSON.stringify(response.data, null, 2));
      
      // Trả về kết quả
      return {
        ...response.data,
        payment: payment
      };
    } catch (error) {
      console.error('Error querying MoMo transaction:', error);
      throw error;
    }
  },
  
  /**
   * Xử lý IPN từ MoMo
   * @param {Object} requestBody - Dữ liệu từ MoMo
   * @returns {Object} Kết quả xử lý
   */
  async handleMomoIPN(requestBody) {
    try {
      console.log('MoMo IPN Data:', JSON.stringify(requestBody, null, 2));
      
      const { orderId, resultCode, message, amount, transId, payType, extraData } = requestBody;
      
      // Tìm giao dịch theo mã giao dịch
      const payment = await Payment.findOne({ transactionId: orderId }).populate('user subscription.package');
      
      if (!payment) {
        throw new Error('Không tìm thấy giao dịch');
      }

      // Kiểm tra nếu giao dịch đã được xử lý
      if (payment.status === 'SUCCESS') {
        return {
          success: true,
          message: 'Giao dịch đã được xử lý trước đó',
          payment
        };
      }
      
      // Xác thực chữ ký
      const isValidSignature = this._verifyMomoSignature(requestBody);
      if (!isValidSignature) {
        console.error('Invalid MoMo signature for IPN:', orderId);
        throw new Error('Chữ ký không hợp lệ');
      }
      
      // Kiểm tra mã phản hồi
      if (resultCode === 0 || resultCode === '0') {
        // Cập nhật trạng thái thanh toán thành công
        payment.status = 'SUCCESS';
        payment.paymentDetails = {
          ...payment.paymentDetails,
          momoTransId: transId,
          momoPayType: payType,
          momoMessage: message,
          momoExtraData: extraData,
          momoResultCode: resultCode,
          completedAt: new Date()
        };
        await payment.save();
        
        // Giải mã extraData để lấy thông tin bổ sung (nếu có)
        let decodedExtraData = {};
        try {
          if (extraData) {
            const extraDataString = Buffer.from(extraData, 'base64').toString();
            decodedExtraData = JSON.parse(extraDataString);
          }
        } catch (error) {
          console.warn('Could not decode extraData:', error.message);
        }
        
        // Kích hoạt gói đăng ký
        try {
          await subscriptionService.subscribePackage(
            payment.user._id,
            payment.subscription.package._id,
            { 
              transactionId: orderId,
              amount: payment.totalAmount,
              extraData: decodedExtraData
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
        payment.status = 'FAILED';
        payment.paymentDetails = {
          ...payment.paymentDetails,
          errorCode: resultCode,
          momoTransId: transId,
          momoPayType: payType,
          momoMessage: message,
          momoExtraData: extraData,
          failedAt: new Date()
        };
        await payment.save();
        
        return {
          success: false,
          message: 'Thanh toán thất bại',
          errorCode: resultCode,
          payment
        };
      }
    } catch (error) {
      console.error('Error handling MoMo IPN:', error);
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
      const redirectUrl = payment.paymentDetails.returnUrl || paymentConfig.defaultReturnUrl;
      const ipnUrl = paymentConfig.momo.notifyUrl;
      const extraData = Buffer.from(JSON.stringify({
        userId: user._id.toString(),
        packageId: packageInfo._id.toString()
      })).toString('base64');
      const requestType = paymentConfig.momo.requestType;
      const orderType = paymentConfig.momo.orderType;
      const lang = paymentConfig.momo.lang;
      
      // Tạo raw signature đúng thứ tự theo tài liệu MoMo
      const rawSignature =
        `accessKey=${accessKey}` +
        `&amount=${amount}` +
        `&extraData=${extraData}` +
        `&ipnUrl=${ipnUrl}` +
        `&orderId=${orderId}` +
        `&orderInfo=${orderInfo}` +
        `&partnerCode=${partnerCode}` +
        `&redirectUrl=${redirectUrl}` +
        `&requestId=${requestId}` +
        `&requestType=${requestType}`;
      
      // Tạo chữ ký
      const signature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
      
      // Chuẩn bị dữ liệu gửi tới MoMo (vẫn gửi orderType, lang nếu muốn)
      const requestBody = {
        partnerCode,
        accessKey,
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl,
        ipnUrl,
        extraData,
        requestType,
        orderType,
        lang,
        signature
      };
      
      console.log('MoMo Request Body:', JSON.stringify(requestBody, null, 2));
      
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
      
      console.log('MoMo Response:', JSON.stringify(response.data, null, 2));
      
      // Kiểm tra kết quả từ MoMo
      if (response.data.resultCode === 0) {
        // Lưu thông tin chi tiết vào payment
        payment.paymentDetails = {
          ...payment.paymentDetails,
          momoRequestId: requestId,
          momoSignature: signature,
          momoPayUrl: response.data.payUrl
        };
        await payment.save();
        
        // Trả về URL thanh toán
        return response.data.payUrl;
      } else {
        throw new Error(`Lỗi tạo URL thanh toán MoMo: ${response.data.message || 'Không xác định'}`);
      }
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
      console.log('Verifying MoMo signature for request:', JSON.stringify(requestBody, null, 2));
      
      // Lấy chữ ký nhận được từ MoMo
      const signature = requestBody.signature;
      
      if (!signature) {
        console.error('No signature found in MoMo request');
        return false;
      }
      
      // Tạo một object mới không bao gồm signature để tạo chuỗi xác thực
      const { signature: _, ...signParams } = requestBody;
      
      // Sắp xếp các tham số theo thứ tự alphabet
      const sortedKeys = Object.keys(signParams).sort();
      
      // Tạo chuỗi raw signature theo đúng định dạng MoMo yêu cầu
      const rawSignature = sortedKeys
        .filter(key => signParams[key] !== undefined && signParams[key] !== null && signParams[key] !== '')
        .map(key => `${key}=${signParams[key]}`)
        .join('&');
      
      // Tạo chữ ký để so sánh
      const computedSignature = crypto.createHmac('sha256', paymentConfig.momo.secretKey)
        .update(rawSignature)
        .digest('hex');
      
      console.log('Raw Signature for verify:', rawSignature);
      console.log('Received Signature:', signature);
      console.log('Computed Signature:', computedSignature);
      
      // So sánh chữ ký
      return computedSignature === signature;
    } catch (error) {
      console.error('Error verifying MoMo signature:', error);
      return false;
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