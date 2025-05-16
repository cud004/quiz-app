const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const subscriptionService = require('./subscriptionService');
const paymentConfig = require('../config/payment');
const vnpayService = require('./vnpayService');
const momoService = require('./momoService');
const crypto = require('crypto');
const AuthService = require('../services/auth/authService');
const { calculateGatewayAmount, formatCurrency } = require('../utils/paymentUtils');

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
      // Sử dụng VNPayService để tạo URL thanh toán
      const vnpayResult = await vnpayService.createPayment(
        userId, 
        packageId,
        {
          ...options,
          returnUrl: options.returnUrl || paymentConfig.vnpay.returnUrl || payment.paymentDetails.returnUrl,
          ipAddress: options.ipAddress || payment.paymentDetails.ipAddress,
          bankCode: options.bankCode || payment.paymentDetails.bankCode
        }
      );
      
      paymentUrl = vnpayResult.paymentUrl;
      
      // Cập nhật thông tin giao dịch nếu cần
      if (vnpayResult.transactionId && vnpayResult.transactionId !== payment.transactionId) {
        payment.transactionId = vnpayResult.transactionId;
        await payment.save();
      }
    } else if (paymentMethod === 'momo') {
      paymentUrl = await momoService._createMomoPaymentUrl(payment, packageInfo, user);
    }
    
    return {
      success: true,
      paymentId: payment._id,
      paymentUrl: paymentUrl,
      transactionId: payment.transactionId,
      requiresPayment: true
    };
  },

  /**
   * Xử lý callback từ VNPay
   * @param {Object} vnpParams - Tham số từ VNPay
   * @returns {Object} Kết quả xử lý
   */
  async handleVNPayReturn(vnpParams) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log('Processing VNPay return callback:', {
        params: vnpParams,
        timestamp: new Date().toISOString()
      });

      // Xác thực callback từ VNPay
      const result = await vnpayService.verifyReturnUrl(vnpParams);
      
      if (!result.success) {
        console.error('VNPay verification failed:', result);
        await session.abortTransaction();
        return result;
      }

      const payment = result.payment;
      console.log('Payment verification successful:', {
        transactionId: payment.transactionId,
        status: payment.status,
        amount: payment.totalAmount
      });

      // Nếu thanh toán thành công và chưa được xử lý
      if (result.success && payment.status === 'completed' && !payment.completedAt) {
        try {
          // Kích hoạt gói đăng ký
          console.log('Activating subscription:', {
            userId: payment.user._id,
            packageId: payment.subscription.package._id
          });

          await subscriptionService.subscribePackage(
            payment.user._id,
            payment.subscription.package._id,
            {
              transactionId: payment.transactionId,
              amount: payment.totalAmount
            },
            session
          );

          // Gửi email thông báo
          try {
            await AuthService.sendEmail({
              to: payment.user.email,
              subject: 'Thanh toán thành công',
              template: 'payment-success',
              context: {
                name: payment.user.name,
                packageName: payment.subscription.package.name,
                amount: payment.totalAmount.toLocaleString('vi-VN') + ' VNĐ',
                transactionId: payment.transactionId
              }
            });
            console.log('Success notification email sent');
          } catch (emailError) {
            console.error('Error sending success notification email:', emailError);
            // Don't throw error here, continue with the transaction
          }

          await session.commitTransaction();
          console.log('Payment transaction committed successfully');
        } catch (error) {
          console.error('Error processing successful payment:', error);
          await session.abortTransaction();
          throw error;
        }
      } else if (payment.status === 'failed') {
        try {
          // Gửi email thông báo thất bại
          await AuthService.sendEmail({
            to: payment.user.email,
            subject: 'Thanh toán thất bại',
            template: 'payment-failed',
            context: {
              name: payment.user.name,
              packageName: payment.subscription.package.name,
              amount: payment.totalAmount.toLocaleString('vi-VN') + ' VNĐ',
              transactionId: payment.transactionId,
              reason: vnpParams.vnp_ResponseCode
            }
          });
          console.log('Failure notification email sent');
        } catch (emailError) {
          console.error('Error sending failure notification email:', emailError);
        }

        await session.commitTransaction();
        console.log('Failed payment transaction committed');
      }

      return result;
    } catch (error) {
      console.error('Error in handleVNPayReturn:', error);
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  /**
   * Xử lý kết quả từ cổng thanh toán Momo
   * @param {object} requestBody - Dữ liệu từ Momo
   * @returns {object} Kết quả xử lý thanh toán
   */
  async handleMomoReturn(requestBody) {
    try {
      console.log('MoMo callback data:', JSON.stringify(requestBody, null, 2));
      
      const result = await momoService.handleMomoReturn(requestBody);

      if (result.success && result.payment) {
        const payment = result.payment;
        
        if (payment.status === 'completed' && payment.user && payment.subscription.package) {
          try {
            const user = await User.findById(payment.user._id);
            if (!user) throw new Error('Không tìm thấy người dùng');

            const needsActivation = !user.subscription || 
                                  !user.subscription.package || 
                                  user.subscription.package.toString() !== payment.subscription.package._id.toString() ||
                                  user.subscription.status !== 'active';

            if (needsActivation) {
              const subscriptionResult = await subscriptionService.subscribePackage(
                payment.user._id,
                payment.subscription.package._id,
                {
                  transactionId: payment.transactionId,
                  amount: payment.totalAmount
                }
              );
              
              console.log(`Đã kích hoạt gói đăng ký ${payment.subscription.package.name} cho người dùng ${user.name}`);
              
              return { 
                success: true, 
                message: 'Thanh toán MoMo thành công và đã kích hoạt gói đăng ký',
                payment: payment,
                subscription: subscriptionResult
              };
            } else {
              console.log(`Người dùng ${user._id} đã có gói đăng ký hoạt động`);
              return { 
                success: true, 
                message: 'Thanh toán MoMo thành công, gói đăng ký đã tồn tại',
                payment: payment
              };
            }
          } catch (subscriptionError) {
            console.error('Lỗi khi kích hoạt gói đăng ký:', subscriptionError);
            payment.paymentDetails.subscriptionError = subscriptionError.message;
            await payment.save();
            
            return { 
              success: true, 
              message: 'Thanh toán MoMo thành công nhưng có lỗi khi kích hoạt gói đăng ký',
              payment: payment,
              error: subscriptionError.message
            };
          }
        }
        
        return { 
          success: true, 
          message: 'Đã xử lý thanh toán MoMo',
          payment: payment
        };
      }

      return { 
        success: false, 
        message: 'Thanh toán MoMo thất bại', 
        result 
      };
    } catch (error) {
      console.error('Lỗi xử lý callback MoMo:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Cập nhật gói đăng ký cho người dùng sau khi thanh toán thành công
   * @param {string} userId - ID của người dùng
   * @param {string} packageId - ID của gói đăng ký
   * @returns {object} Kết quả cập nhật gói đăng ký
   */
  async updateSubscriptionAfterPayment(userId, packageId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('ID người dùng không hợp lệ');
      }
      
      if (!mongoose.Types.ObjectId.isValid(packageId)) {
        throw new Error('ID gói đăng ký không hợp lệ');
      }
      
      const user = await User.findById(userId);
      if (!user) throw new Error('Người dùng không tồn tại');

      const packageInfo = await SubscriptionPackage.findById(packageId);
      if (!packageInfo) throw new Error('Gói đăng ký không tồn tại');

      console.log(`Đang cập nhật gói đăng ký ${packageInfo.name} cho người dùng ${user.name}`);
      
      const subscriptionResult = await subscriptionService.subscribePackage(
        userId, 
        packageId,
        {
          amount: packageInfo.price,
          transactionId: `DIRECT_${Date.now()}`
        }
      );

      return {
        success: true,
        message: `Gói ${packageInfo.name} đã được kích hoạt cho người dùng ${user.name}`,
        subscription: subscriptionResult
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật gói đăng ký:', error);
      throw new Error('Không thể cập nhật gói đăng ký: ' + error.message);
    }
  },

  /**
   * Lấy lịch sử thanh toán của người dùng
   * @param {string} userId - ID người dùng
   * @param {Object} options - Tùy chọn phân trang
   * @returns {Object} Danh sách thanh toán và thông tin phân trang
   */
  async getUserPaymentHistory(userId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('ID người dùng không hợp lệ');
    }
    
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;
    
    const payments = await Payment.find({ user: userId })
      .populate('subscription.package')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const total = await Payment.countDocuments({ user: userId });
    
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
   * Lấy thông tin giao dịch theo ID
   * @param {string} paymentId - ID giao dịch 
   * @param {string} userId - ID người dùng yêu cầu (để kiểm tra quyền)
   * @returns {Object} Thông tin giao dịch
   */
  async getPaymentById(paymentId, userId) {
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new Error('ID giao dịch không hợp lệ');
    }
    
    const payment = await Payment.findById(paymentId)
      .populate('user', 'name email')
      .populate('subscription.package');
    
    if (!payment) {
      throw new Error('Không tìm thấy giao dịch');
    }
    
    if (payment.user._id.toString() !== userId) {
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
    
    const payment = await Payment.findOne({ transactionId })
      .populate('user', 'name email')
      .populate('subscription.package');
    
    return payment;
  }
};

module.exports = paymentService;