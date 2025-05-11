const vnpayService = require('../services/vnpayService');
const paymentService = require('../services/paymentService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Controller xử lý thanh toán qua VNPay
 */
const vnpayController = {
  /**
   * Tạo phiên thanh toán mới
   * @route POST /api/payments/vnpay/create
   * @access Private
   */
  async createPayment(req, res) {
    try {
      const userId = req.user._id;
      const { packageId, bankCode } = req.body;
      
      // Các tùy chọn bổ sung
      const options = {
        returnUrl: req.body.returnUrl,
        ipAddress: req.ip || req.connection.remoteAddress,
        bankCode: bankCode
      };
      
      // Sử dụng vnpayService để tạo phiên thanh toán
      const result = await vnpayService.createPayment(userId, packageId, options);
      
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Xử lý callback từ VNPay
   * @route GET /api/payments/vnpay/return
   * @access Public
   */
  async handleVNPayReturn(req, res) {
    try {
      const result = await vnpayService.verifyReturnUrl(req.query);
      
      // Chuyển hướng đến trang kết quả thanh toán
      const redirectUrl = `${req.query.vnp_ReturnUrl || process.env.PAYMENT_RETURN_URL}?success=${result.success}&message=${encodeURIComponent(result.message)}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy danh sách ngân hàng hỗ trợ VNPay
   * @route GET /api/payments/vnpay/banks
   * @access Public
   */
  async getBanks(req, res) {
    try {
      const banks = await vnpayService.getBankList();
      return ApiResponse.success(res, banks);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Truy vấn thông tin giao dịch
   * @route GET /api/payments/vnpay/query/:transactionId
   * @access Private
   */
  async queryTransaction(req, res) {
    try {
      const { transactionId } = req.params;
      
      // Sử dụng vnpayService để truy vấn thông tin giao dịch
      const result = await vnpayService.queryTransaction(transactionId);
      
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Yêu cầu hoàn tiền
   * @route POST /api/payments/vnpay/:paymentId/refund
   * @access Private
   */
  async requestRefund(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.user._id;
      const { reason, amount } = req.body;
      
      // Tìm giao dịch theo ID
      const payment = await paymentService.getPaymentById(paymentId, userId);
      
      // Sử dụng vnpayService để yêu cầu hoàn tiền
      const result = await vnpayService.refundTransaction(
        payment.transactionId, 
        amount || payment.totalAmount, 
        reason, 
        userId
      );
      
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  }
};

module.exports = vnpayController; 