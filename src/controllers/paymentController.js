const paymentService = require('../services/paymentService');
// Bỏ comment các service thanh toán
const vnpayService = require('../services/vnpayService');
const momoService = require('../services/momoService');
const ApiResponse = require('../utils/apiResponse');

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
      
      // Kích hoạt tính năng thanh toán
      let result;
      
      if (paymentMethod === 'vnpay') {
        // Sử dụng VNPay Service
        result = await vnpayService.createPayment(userId, packageId, options);
      } else if (paymentMethod === 'momo') {
        // Sử dụng MoMo Service
        result = await momoService.createPayment(userId, packageId, options);
      }
      
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
  }
};

module.exports = paymentController; 