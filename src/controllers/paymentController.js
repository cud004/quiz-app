const paymentService = require('../services/paymentService');
// Bỏ comment các service thanh toán
const vnpayService = require('../services/vnpayService');
const momoService = require('../services/momoService');
const ApiResponse = require('../utils/apiResponse');
const subscriptionService = require('../services/subscriptionService');
const Payment = require('../models/Payment');
const AuthService = require('../services/auth/authService');
const User = require('../models/User');
const { 
  validatePaymentData, 
  validateVNPayResponse,
  validateVNPayPayment,
  validateVNPayIPN
} = require('../validations/paymentValidation');
const paymentConfig = require('../config/payment');

const paymentController = {
  /**
   * Tạo phiên thanh toán mới
   * @route POST /api/payments/create
   * @access Private
   */
  async createPaymentSession(req, res) {
    try {
      const { packageId, paymentMethod, bankCode } = req.body;
      const userId = req.user._id;

      // Validate request data
      const { error } = validatePaymentData(req.body);
      if (error) {
        return ApiResponse.badRequest(res, error.details[0].message);
      }

      // Thêm log chi tiết
      console.log('[PaymentController] Nhận yêu cầu tạo payment session:', { 
        userId, 
        packageId, 
        paymentMethod, 
        bankCode, 
        body: req.body 
      });

      // Gọi service tạo payment session
      const result = await paymentService.createPaymentSession(
        userId, 
        packageId, 
        paymentMethod, 
        {
          bankCode,
          returnUrl: req.body.returnUrl,
          cancelUrl: req.body.cancelUrl,
          ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1'
        }
      );

      console.log('[PaymentController] Kết quả trả về:', result);
      return ApiResponse.success(res, result);
    } catch (error) {
      console.error('Error creating payment session:', error);
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
      const { page, limit } = req.query;

      const result = await paymentService.getUserPaymentHistory(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      });

      return ApiResponse.success(res, result);
    } catch (error) {
      console.error('Error getting payment history:', error);
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
      const { paymentId } = req.params;
      const userId = req.user._id;

      const payment = await paymentService.getPaymentById(paymentId, userId);
      return ApiResponse.success(res, payment);
    } catch (error) {
      console.error('Error getting payment by ID:', error);
      return ApiResponse.error(res, error.message);
    }
  },

  /**
   * Lấy danh sách ngân hàng theo gateway (tổng quát)
   * @route GET /api/payments/banks/:method
   * @access Public
   */
  async getBanks(req, res) {
    try {
      const { method } = req.params;
      const banks = await paymentService.getBanks(method);
      res.json(banks);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Callback tổng quát cho các gateway
   * @route ALL /api/payments/callback/:method
   * @access Public
   */
  async handleCallback(req, res) {
    try {
      const { method } = req.params;
      const result = await paymentService.handleCallback(method, req.query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * IPN tổng quát cho các gateway
   * @route ALL /api/payments/ipn/:method
   * @access Public
   */
  async handleIPN(req, res) {
    try {
      const { method } = req.params;
      const result = await paymentService.handleIPN(method, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Lấy trạng thái thanh toán tổng quát
   * @route GET /api/payments/status/:method
   * @access Public
   */
  async getPaymentStatus(req, res) {
    try {
      const { method } = req.params;
      const result = await paymentService.getPaymentStatus(method, req.query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Lấy thông tin giao dịch theo mã giao dịch
   * @route GET /api/payments/query/:transactionId
   * @access Private
   */
  async getPaymentByTransactionId(req, res) {
    try {
      const { transactionId } = req.params;
      const payment = await paymentService.getPaymentByTransactionId(transactionId);
      return ApiResponse.success(res, payment);
    } catch (error) {
      console.error('Error getting payment by transaction ID:', error);
      return ApiResponse.error(res, error.message);
    }
  },

  // VNPay specific routes (for gateway only)
  async handleVnpayCallback(req, res) {
    try {
      // Validate VNPay response
      const { error } = validateVNPayResponse(req.query);
      if (error) {
        console.error('Invalid VNPay callback data:', error);
        return res.status(400).json({ message: 'Dữ liệu callback không hợp lệ', details: error.details });
      }

      // Xử lý callback
      const result = await vnpayService.verifyReturnUrl(req.query);
      
      // Redirect về trang kết quả
      const redirectUrl = result.success
        ? `${paymentConfig.defaultReturnUrl}?status=success&transactionId=${result.payment.transactionId}`
        : `${paymentConfig.defaultReturnUrl}?status=failed&transactionId=${result.payment.transactionId}`;

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error handling VNPay callback:', error);
      res.redirect(`${paymentConfig.defaultReturnUrl}?status=error&message=${encodeURIComponent(error.message)}`);
    }
  },

  /**
   * Xử lý IPN từ VNPay
   * @route POST /api/payments/vnpay/ipn
   * @access Public
   */
  async handleVnpayIPN(req, res) {
    try {
      // Validate IPN data
      const { error } = validateVNPayIPN(req.body);
      if (error) {
        console.error('Invalid VNPay IPN data:', error);
        return res.status(400).json({ 
          RspCode: '97',
          Message: 'Invalid data'
        });
      }

      // Xử lý IPN
      const result = await vnpayService.handleIPN(req.body);
      
      // Trả về kết quả cho VNPay
      return res.json({
        RspCode: '00',
        Message: 'Confirm success'
      });
    } catch (error) {
      console.error('Error handling VNPay IPN:', error);
      return res.status(500).json({
        RspCode: '99',
        Message: 'Unknown error'
      });
    }
  },

  // MoMo specific routes (for gateway only)
  async handleMomoCallback(req, res) {
    try {
      const result = await momoService.handleCallback(req.query);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async handleMomoIPN(req, res) {
    try {
      const result = await momoService.handleIPN(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * Xử lý kết quả thanh toán từ gateway
   * @route GET /api/payments/result
   * @access Public
   */
  async handlePaymentResult(req, res) {
    try {
      const { method, status, message, transactionId } = req.query;
      
      // Kiểm tra trạng thái thanh toán
      if (status === 'success') {
        // Nếu thành công, chuyển hướng về trang success
        return res.redirect(`/payment/success?transactionId=${transactionId}`);
      } else {
        // Nếu thất bại, chuyển hướng về trang error
        return res.redirect(`/payment/error?message=${message || 'Thanh toán thất bại'}`);
      }
    } catch (error) {
      console.error('Error handling payment result:', error);
      return res.redirect('/payment/error?message=Có lỗi xảy ra khi xử lý kết quả thanh toán');
    }
  }
};

module.exports = paymentController; 