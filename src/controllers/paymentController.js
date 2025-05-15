const paymentService = require('../services/paymentService');
// Bỏ comment các service thanh toán
const vnpayService = require('../services/vnpayService');
const momoService = require('../services/momoService');
const ApiResponse = require('../utils/apiResponse');
const subscriptionService = require('../services/subscriptionService');
const Payment = require('../models/Payment');
const AuthService = require('../services/auth/authService');
const User = require('../models/User');


const paymentController = {
  /**
   * Tạo phiên thanh toán mới
   * @route POST /api/payments/create
   * @access Private
   */
  async createPaymentSession(req, res) {
    try {
      const userId = req.user._id;
      const { packageId, paymentMethod, bankCode } = req.body;
      
      // Kiểm tra phương thức thanh toán hợp lệ
      if (!['vnpay', 'momo'].includes(paymentMethod)) {
        return ApiResponse.badRequest(res, 'Phương thức thanh toán không hợp lệ. Hỗ trợ: vnpay, momo');
      }
      
      // Các tùy chọn bổ sung
      const options = {
        returnUrl: req.body.returnUrl,
        ipAddress: req.ip || req.connection.remoteAddress,
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
      return ApiResponse.badRequest(res, error.message);
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
      const { page, limit } = req.query;
      
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      };
      
      const result = await paymentService.getUserPaymentHistory(userId, options);
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
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
      const payment = await paymentService.getPaymentByTransactionId(transactionId);
      
      if (!payment) {
        return ApiResponse.notFound(res, 'Không tìm thấy giao dịch');
      }
      
      // Kiểm tra người dùng có quyền xem giao dịch này không
      if (payment.user.toString() !== userId.toString()) {
        return ApiResponse.forbidden(res, 'Bạn không có quyền truy vấn giao dịch này');
      }
      
      return ApiResponse.success(res, { payment });
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
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
      
      const payment = await paymentService.getPaymentById(paymentId, userId);
      return ApiResponse.success(res, payment);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  },

  /**
   * Xử lý kết quả thanh toán và cập nhật subscription
   * @route GET /api/payments/result
   * @access Public
   */
  async handlePaymentResult(req, res) {
    try {
      console.log('Xử lý kết quả thanh toán chung:', req.query);
      
      const { vnp_ResponseCode, vnp_TxnRef } = req.query;
      
      if (!vnp_TxnRef) {
        return res.redirect('/payment/error?message=' + encodeURIComponent('Không tìm thấy thông tin giao dịch'));
      }

      // Tìm thông tin giao dịch
      const payment = await Payment.findOne({ transactionId: vnp_TxnRef })
        .populate('user subscription.package');
      
      if (!payment) {
        return res.redirect('/payment/error?message=' + encodeURIComponent('Không tìm thấy thông tin giao dịch'));
      }

      // Kiểm tra nếu giao dịch đã được xử lý
      if (payment.status === 'completed') {
        console.log(`Giao dịch đã được xử lý trước đó: ${payment.transactionId}`);
        return res.redirect(`/payment/success?package=${payment.subscription.package.name}&duration=${payment.subscription.duration}`);
      }

      // Khi đến đây, giao dịch chưa được xử lý hoặc chưa hoàn tất
      
      if (vnp_ResponseCode === '00') {
        console.log(`Cập nhật giao dịch thành công: ${payment.transactionId}`);
        // Cập nhật trạng thái giao dịch
        payment.status = 'completed';
        payment.paymentDetails = {
          ...payment.paymentDetails,
          responseCode: vnp_ResponseCode,
          completedAt: new Date()
        };
        await payment.save();

        try {
          // Kiểm tra xem user đã có gói đăng ký kích hoạt chưa trước khi kích hoạt lại
          const user = await User.findById(payment.user._id);
          
          // Chỉ kích hoạt nếu user chưa có gói hoặc gói khác với gói đang thanh toán
          const needsActivation = !user.subscription || 
                                !user.subscription.package || 
                                user.subscription.package.toString() !== payment.subscription.package._id.toString() ||
                                user.subscription.status !== 'active';
                                
          if (needsActivation) {
            console.log(`Kích hoạt gói đăng ký cho user: ${user._id}, gói: ${payment.subscription.package.name}`);
            
            // Kích hoạt gói đăng ký cho người dùng
            const subscriptionResult = await subscriptionService.subscribePackage(
              payment.user._id,
              payment.subscription.package._id,
              {
                transactionId: vnp_TxnRef,
                amount: payment.totalAmount
              }
            );
            
            console.log('Kích hoạt gói đăng ký thành công');
          } else {
            console.log(`User ${user._id} đã có gói đăng ký ${payment.subscription.package.name} kích hoạt rồi`);
          }

          // Gửi email thông báo thanh toán thành công
          await AuthService.sendEmail({
            to: payment.user.email,
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

          // Chuyển hướng đến trang thành công với thông tin subscription
          return res.redirect(`/payment/success?package=${payment.subscription.package.name}&duration=${payment.subscription.duration}&transactionId=${vnp_TxnRef}`);
        } catch (error) {
          console.error('Lỗi khi xử lý đăng ký:', error);
          // Nếu có lỗi khi xử lý subscription, vẫn cập nhật trạng thái thanh toán
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
          failedAt: new Date()
        };
        await payment.save();

        // Gửi email thông báo thanh toán thất bại
        try {
          await AuthService.sendEmail({
            to: payment.user.email,
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
        } catch (emailError) {
          console.error('Lỗi gửi email thông báo thanh toán thất bại:', emailError);
        }

        return res.redirect('/payment/error?message=' + encodeURIComponent('Thanh toán thất bại. Mã lỗi: ' + vnp_ResponseCode));
      }
    } catch (error) {
      console.error('Lỗi xử lý kết quả thanh toán:', error);
      return res.redirect('/payment/error?message=' + encodeURIComponent(error.message));
    }
  }
};

module.exports = paymentController; 