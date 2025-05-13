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
      
      console.log('Creating MoMo payment session with options:', options);
      
      // Sử dụng momoService để tạo phiên thanh toán
      const result = await momoService.createPayment(userId, packageId, options);
      
      return ApiResponse.success(res, result);
    } catch (error) {
      console.error('Error creating MoMo payment:', error);
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Xử lý callback từ MoMo
   * @route POST /api/payments/momo/notify
   * @access Public
   */
  async handleMomoReturn(req, res) {
    try {
      console.log('Received MoMo notify callback:', req.body);
      
      // Xử lý callback từ MoMo
      const result = await momoService.handleMomoReturn(req.body);
      
      // Trả về kết quả cho MoMo
      return ApiResponse.success(res, {
        status: result.success ? 'success' : 'error',
        message: result.message
      });
    } catch (error) {
      console.error('Error handling MoMo notify callback:', error);
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Xử lý chuyển hướng từ MoMo
   * @route GET /api/payments/momo/return
   * @access Public
   */
  async handleMomoRedirect(req, res) {
    try {
      console.log('Received MoMo redirect:', req.query);
      
      // Trích xuất thông tin từ query params
      const { orderId, resultCode, message } = req.query;
      
      // Chuyển hướng đến trang kết quả thanh toán
      const success = resultCode === '0' || resultCode === 0;
      const redirectUrl = `${process.env.PAYMENT_RETURN_URL || '/payment/result'}?success=${success}&orderId=${orderId}&message=${encodeURIComponent(message)}`;
      
      console.log('Redirecting to:', redirectUrl);
      
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error handling MoMo redirect:', error);
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
      
      console.log('Querying MoMo transaction:', transactionId);
      
      // Sử dụng momoService để truy vấn thông tin giao dịch
      const result = await momoService.queryTransaction(transactionId);
      
      return ApiResponse.success(res, result);
    } catch (error) {
      console.error('Error querying MoMo transaction:', error);
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
      
      console.log('Requesting MoMo refund for payment:', paymentId);
      
      // Sử dụng momoService để yêu cầu hoàn tiền
      const result = await momoService.requestRefund(paymentId, userId, reason);
      
      return ApiResponse.success(res, result);
    } catch (error) {
      console.error('Error requesting MoMo refund:', error);
      return ApiResponse.badRequest(res, error.message);
    }
  }
};

module.exports = momoController; 