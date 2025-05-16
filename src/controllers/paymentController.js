const paymentService = require('../services/paymentService');
// Bỏ comment các service thanh toán
const vnpayService = require('../services/vnpayService');
const momoService = require('../services/momoService');
const ApiResponse = require('../utils/apiResponse');
const subscriptionService = require('../services/subscriptionService');
const Payment = require('../models/Payment');
const AuthService = require('../services/auth/authService');
const User = require('../models/User');
const { createPaymentSessionSchema } = require('../validations/paymentValidation');


const paymentController = {
  /**
   * Tạo phiên thanh toán mới
   * @route POST /api/payments/create
   * @access Private
   */
  async createPaymentSession(req, res) {
    try {
      // Validate input
      const { error } = createPaymentSessionSchema.validate(req.body);
      if (error) {
        return ApiResponse.badRequest(res, error.details[0].message);
      }

      const userId = req.user._id;
      const { packageId, paymentMethod, bankCode } = req.body;
      
      // Kiểm tra phương thức thanh toán hợp lệ
      if (!['vnpay', 'momo'].includes(paymentMethod)) {
        return ApiResponse.badRequest(res, 'Phương thức thanh toán không hợp lệ. Hỗ trợ: vnpay, momo');
      }
      
      // Các tùy chọn bổ sung
      const options = {
        returnUrl: req.body.returnUrl,
        ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1',
        bankCode: bankCode // Thêm bankCode cho VNPay
      };
      
      // Sử dụng paymentService để tạo phiên thanh toán thống nhất
      const result = await paymentService.createPaymentSession(
        userId, 
        packageId, 
        paymentMethod, 
        options
      );
      
      return ApiResponse.success(res, result);
    } catch (error) {
      console.error('Lỗi tạo phiên thanh toán:', error);
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy danh sách phương thức thanh toán
   * @route GET /api/payments/methods
   * @access Public
   */
  async getPaymentMethods(req, res) {
    try {
      // Danh sách các phương thức thanh toán hỗ trợ
      const methods = [
        {
          id: 'vnpay',
          name: 'VNPay',
          description: 'Thanh toán qua cổng VNPay với các ngân hàng Việt Nam',
          icon: '/images/payment/vnpay.png',
          requiresBankSelection: true,
          isActive: true,
          apiEndpoint: '/api/payments/vnpay/create'
        },
        {
          id: 'momo',
          name: 'MoMo',
          description: 'Thanh toán qua ví điện tử MoMo',
          icon: '/images/payment/momo.png',
          requiresBankSelection: false,
          isActive: true,
          apiEndpoint: '/api/payments/momo/create'
        }
      ];
      
      return ApiResponse.success(res, methods);
    } catch (error) {
      console.error('Lỗi lấy danh sách phương thức thanh toán:', error);
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy lịch sử thanh toán của người dùng
   * @route GET /api/payments/history
   * @access Private
   */
  async getPaymentHistory(req, res) {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, status } = req.query;
      
      const query = { user: userId };
      if (status) {
        query.status = status;
      }
      
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 },
        populate: [
          { path: 'user', select: 'name email' },
          { path: 'subscription.package', select: 'name price duration' }
        ]
      };
      
      const payments = await Payment.paginate(query, options);
      return ApiResponse.success(res, payments);
    } catch (error) {
      console.error('Lỗi lấy lịch sử thanh toán:', error);
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Truy vấn thông tin giao dịch
   * @route GET /api/payments/query/:transactionId
   * @access Private
   */
  async queryTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user._id;
      
      // Tìm giao dịch theo mã giao dịch
      const payment = await Payment.findOne({ transactionId })
        .populate('user', 'name email')
        .populate('subscription.package', 'name price duration');
      
      if (!payment) {
        return ApiResponse.notFound(res, 'Không tìm thấy giao dịch');
      }
      
      // Kiểm tra quyền truy cập
      if (payment.user._id.toString() !== userId.toString()) {
        return ApiResponse.forbidden(res, 'Bạn không có quyền truy cập giao dịch này');
      }
      
      return ApiResponse.success(res, payment);
    } catch (error) {
      console.error('Lỗi truy vấn giao dịch:', error);
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy thông tin giao dịch theo ID
   * @route GET /api/payments/:paymentId
   * @access Private
   */
  async getPaymentById(req, res) {
    try {
      const userId = req.user._id;
      const { paymentId } = req.params;
      
      const payment = await Payment.findOne({ _id: paymentId, user: userId })
        .populate('user', 'name email')
        .populate('subscription.package', 'name price duration');
      
      if (!payment) {
        return ApiResponse.notFound(res, 'Không tìm thấy giao dịch');
      }
      
      return ApiResponse.success(res, payment);
    } catch (error) {
      console.error('Lỗi lấy thông tin giao dịch:', error);
      return ApiResponse.error(res, error.message);
    }
  },

  /**
   * Xử lý kết quả thanh toán và cập nhật subscription
   * @route GET /api/payments/result
   * @access Public
   */
  async handlePaymentResult(req, res) {
    try {
      console.log('==== Xử lý kết quả thanh toán từ VNPay ====');
      console.log('Request query:', JSON.stringify(req.query, null, 2));
      console.log('Method:', req.method);
      console.log('Headers:', JSON.stringify(req.headers, null, 2));
      console.log('Path:', req.path);
      console.log('URL:', req.originalUrl);
      console.log('===================================');
      
      const { vnp_ResponseCode, vnp_TxnRef } = req.query;
      
      if (!vnp_TxnRef) {
        console.error('Thiếu mã giao dịch (vnp_TxnRef) trong callback');
        return res.redirect('/payment/error?message=' + encodeURIComponent('Không tìm thấy thông tin giao dịch'));
      }

      console.log(`Tìm giao dịch với mã: ${vnp_TxnRef}`);
      // Tìm thông tin giao dịch
      const payment = await Payment.findOne({ transactionId: vnp_TxnRef })
        .populate('user')
        .populate('subscription.package');
      
      if (!payment) {
        console.error(`Không tìm thấy giao dịch với mã: ${vnp_TxnRef}`);
        return res.redirect('/payment/error?message=' + encodeURIComponent('Không tìm thấy thông tin giao dịch'));
      }

      console.log(`Tìm thấy giao dịch:`, {
        id: payment._id,
        transactionId: payment.transactionId,
        status: payment.status,
        userId: payment.user?._id,
        packageId: payment.subscription?.package?._id
      });

      // Kiểm tra nếu giao dịch đã được xử lý
      if (payment.status === 'completed') {
        console.log(`Giao dịch đã được xử lý trước đó: ${payment.transactionId}`);
        const redirectUrl = `/payment/success?package=${encodeURIComponent(payment.subscription.package.name)}&price=${payment.totalAmount}&transactionId=${payment.transactionId}`;
        return res.redirect(redirectUrl);
      }

      // Xử lý kết quả thanh toán
      if (vnp_ResponseCode === '00') {
        console.log(`Cập nhật giao dịch thành công: ${payment.transactionId}`);
        
        // Cập nhật trạng thái giao dịch
        payment.status = 'completed';
        
        // Lưu ý: refundInfo là một Object trong schema, nên phải giữ nguyên nếu đã tồn tại
        const currentRefundInfo = payment.paymentDetails && payment.paymentDetails.refundInfo 
          ? payment.paymentDetails.refundInfo 
          : undefined;
          
        payment.paymentDetails = {
          ...payment.paymentDetails,
          responseCode: vnp_ResponseCode,
          completedAt: new Date(),
          gatewayResponse: req.query
        };
        
        // Gán lại refundInfo nếu đã có từ trước
        if (currentRefundInfo) {
          payment.paymentDetails.refundInfo = currentRefundInfo;
        }
        
        console.log('Lưu thông tin payment vào database');
        try {
          await payment.save();
          console.log('Đã lưu thành công payment với status:', payment.status);
        } catch (saveErr) {
          console.error('Lỗi khi lưu thông tin payment:', saveErr);
          return res.redirect('/payment/error?message=' + encodeURIComponent('Lỗi khi cập nhật thông tin thanh toán: ' + saveErr.message));
        }

        try {
          // Kiểm tra và kích hoạt gói đăng ký
          console.log(`Đang tìm thông tin user với ID: ${payment.user._id}`);
          const user = await User.findById(payment.user._id);
          
          if (!user) {
            throw new Error(`Không tìm thấy người dùng với ID: ${payment.user._id}`);
          }
          
          console.log(`Thông tin subscription hiện tại của user:`, user.subscription || 'Chưa có gói');
          
          const needsActivation = !user.subscription || 
                                !user.subscription.package || 
                                user.subscription.package.toString() !== payment.subscription.package._id.toString() ||
                                user.subscription.status !== 'active';
          
          console.log(`Cần kích hoạt gói đăng ký: ${needsActivation}`);
                                
          if (needsActivation) {
            console.log(`Kích hoạt gói đăng ký cho user: ${user._id}, gói: ${payment.subscription.package.name}`);
            
            const subscriptionResult = await subscriptionService.subscribePackage(
              payment.user._id,
              payment.subscription.package._id,
              {
                transactionId: vnp_TxnRef,
                amount: payment.totalAmount
              }
            );
            
            console.log('Kích hoạt gói đăng ký thành công:', subscriptionResult);
          } else {
            console.log(`User ${user._id} đã có gói đăng ký ${payment.subscription.package.name} kích hoạt rồi`);
          }

          // Gửi email thông báo
          try {
            console.log(`Gửi email thông báo thanh toán thành công đến: ${payment.user.email}`);
            await AuthService.sendEmail({
              email: payment.user.email,
              subject: 'Thanh toán thành công',
              template: 'payment-success',
              context: {
                name: payment.user.name,
                packageName: payment.subscription.package.name,
                amount: payment.totalAmount.toLocaleString('vi-VN') + ' VNĐ',
                transactionId: vnp_TxnRef,
                paymentMethod: payment.paymentMethod
              }
            });
            console.log('Đã gửi email thành công');
          } catch (emailError) {
            console.error('Lỗi gửi email thông báo thanh toán thành công:', emailError);
            // Không ảnh hưởng đến luồng xử lý chính, tiếp tục
          }

          const successUrl = `/payment/success?package=${encodeURIComponent(payment.subscription.package.name)}&price=${payment.totalAmount}&transactionId=${payment.transactionId}`;
          console.log(`Chuyển hướng về trang thành công: ${successUrl}`);
          return res.redirect(successUrl);
        } catch (error) {
          console.error('Lỗi khi xử lý đăng ký:', error);
          payment.paymentDetails.error = error.message;
          await payment.save();
          
          return res.redirect('/payment/error?message=' + encodeURIComponent('Thanh toán thành công nhưng có lỗi khi kích hoạt gói. Vui lòng liên hệ hỗ trợ.'));
        }
      } else {
        console.log(`Cập nhật giao dịch thất bại: ${payment.transactionId}, mã lỗi: ${vnp_ResponseCode}`);
        
        // Cập nhật trạng thái giao dịch thất bại
        payment.status = 'failed';
        payment.paymentDetails = {
          ...payment.paymentDetails,
          responseCode: vnp_ResponseCode,
          failedAt: new Date(),
          gatewayResponse: req.query
        };

        try {
          await payment.save();
          console.log('Đã lưu thông tin payment thất bại');
        } catch (saveError) {
          console.error('Lỗi khi lưu thông tin payment thất bại:', saveError);
        }

        // Gửi email thông báo
        try {
          await AuthService.sendEmail({
            email: payment.user.email,
            subject: 'Thanh toán thất bại',
            template: 'payment-failed',
            context: {
              name: payment.user.name,
              packageName: payment.subscription.package.name,
              amount: payment.totalAmount.toLocaleString('vi-VN') + ' VNĐ',
              transactionId: vnp_TxnRef,
              reason: 'Mã lỗi: ' + vnp_ResponseCode
            }
          });
          console.log('Đã gửi email thông báo thất bại');
        } catch (emailError) {
          console.error('Lỗi gửi email thông báo thanh toán thất bại:', emailError);
        }

        const errorUrl = '/payment/error?message=' + encodeURIComponent('Thanh toán thất bại. Mã lỗi: ' + vnp_ResponseCode);
        console.log(`Chuyển hướng về trang lỗi: ${errorUrl}`);
        return res.redirect(errorUrl);
      }
    } catch (error) {
      console.error('Lỗi xử lý kết quả thanh toán:', error);
      return res.redirect('/payment/error?message=' + encodeURIComponent(error.message));
    }
  }
};

module.exports = paymentController; 