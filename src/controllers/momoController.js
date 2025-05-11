const momoService = require('../services/momoService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Controller xử lý thanh toán qua MoMo
 */
const momoController = {
  /**
   * Tạo phiên thanh toán mới
   * @route POST /api/payments/momo/create
   * @access Private
   */
  async createPayment(req, res) {
    try {
      const userId = req.user._id;
      const { packageId } = req.body;
      
      // Các tùy chọn bổ sung
      const options = {
        returnUrl: req.body.returnUrl,
        ipAddress: req.ip || req.connection.remoteAddress
      };
      
      // Sử dụng momoService để tạo phiên thanh toán
      const result = await momoService.createPayment(userId, packageId, options);
      
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Xử lý callback từ MoMo
   * @route POST /api/payments/momo-notify
   * @access Public
   */
  async handleMomoReturn(req, res) {
    try {
      // Xử lý callback từ MoMo
      const result = await momoService.handleMomoReturn(req.body);
      
      // Trả về kết quả cho MoMo
      return ApiResponse.success(res, {
        status: result.success ? 'success' : 'error',
        message: result.message
      });
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Xử lý chuyển hướng từ MoMo
   * @route GET /api/payments/momo-return
   * @access Public
   */
  async handleMomoRedirect(req, res) {
    try {
      // Trích xuất thông tin từ query params
      const { orderId, resultCode, message } = req.query;
      
      // Chuyển hướng đến trang kết quả thanh toán
      const success = resultCode === '0';
      const redirectUrl = `${process.env.PAYMENT_RETURN_URL || '/payment/result'}?success=${success}&orderId=${orderId}&message=${encodeURIComponent(message)}`;
      
      return res.redirect(redirectUrl);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Truy vấn thông tin giao dịch
   * @route GET /api/payments/momo/query/:transactionId
   * @access Private
   */
  async queryTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      
      // Sử dụng momoService để truy vấn thông tin giao dịch
      const result = await momoService.queryTransaction(transactionId);
      
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Yêu cầu hoàn tiền
   * @route POST /api/payments/momo/:paymentId/refund
   * @access Private
   */
  async requestRefund(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.user._id;
      const { reason } = req.body;
      
      // Sử dụng momoService để yêu cầu hoàn tiền
      const result = await momoService.requestRefund(paymentId, userId, reason);
      
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  }
};

module.exports = momoController; 