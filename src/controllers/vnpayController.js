const vnpayService = require('../services/vnpayService');
const paymentService = require('../services/paymentService');
const ApiResponse = require('../utils/apiResponse');
const subscriptionService = require('../services/subscriptionService');

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
      
      // Chuẩn bị returnUrl - đảm bảo URL tuyệt đối
      let returnUrl = req.body.returnUrl || '/api/payments/result';
      // Nếu returnUrl không bắt đầu bằng http:// hoặc https://, thêm domain
      if (!returnUrl.startsWith('http://') && !returnUrl.startsWith('https://')) {
        // Xác định host từ request headers
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        returnUrl = `${protocol}://${host}${returnUrl.startsWith('/') ? '' : '/'}${returnUrl}`;
      }
      
      console.log(`Chuẩn bị tạo thanh toán VNPay: userId=${userId}, packageId=${packageId}, returnUrl=${returnUrl}`);
      
      // Các tùy chọn bổ sung
      const options = {
        returnUrl: returnUrl,
        ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '127.0.0.1',
        bankCode: bankCode
      };
      
      // Sử dụng vnpayService để tạo phiên thanh toán
      const result = await vnpayService.createPayment(userId, packageId, options);
      
      console.log(`Đã tạo phiên thanh toán VNPay thành công: paymentId=${result.paymentId}, transactionId=${result.transactionId}`);
      
      return ApiResponse.success(res, result);
    } catch (error) {
      console.error('Lỗi tạo thanh toán VNPay:', error);
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Xử lý callback từ cổng VNPay
   * @route GET /api/payments/vnpay/return
   * @access Public
   */
  async handleVNPayReturn(req, res) {
    try {
      console.log('VNPay return callback received:', {
        query: req.query,
        headers: req.headers,
        url: req.url
      });
      
      // Xử lý callback qua service
      const result = await vnpayService.verifyReturnUrl(req.query);
      
      // Kiểm tra kết quả và chuyển hướng người dùng
      if (result.success) {
        const payment = result.payment;
        console.log('Payment successful:', {
          transactionId: payment.transactionId,
          status: payment.status,
          userId: payment.user?._id,
          packageId: payment.subscription?.package?._id
        });

        // Nếu có thông tin payment, lấy ra thông tin gói để hiển thị
        if (payment && payment.subscription && payment.subscription.package) {
          const packageInfo = payment.subscription.package;
          const redirectUrl = `/payment/success?package=${encodeURIComponent(packageInfo.name)}&price=${payment.totalAmount}&transactionId=${payment.transactionId}`;
          console.log('Redirecting to success page:', redirectUrl);
          return res.redirect(redirectUrl);
        }

        // Nếu không có thông tin đầy đủ, redirect với ít thông tin hơn
        const basicRedirectUrl = `/payment/success?transactionId=${req.query.vnp_TxnRef || 'unknown'}`;
        console.log('Redirecting to basic success page:', basicRedirectUrl);
        return res.redirect(basicRedirectUrl);
      } else {
        // Xử lý trường hợp thất bại
        console.error('VNPay payment failed:', result);
        const errorMsg = result.message || 'Thanh toán thất bại';
        const errorRedirectUrl = `/payment/error?message=${encodeURIComponent(errorMsg)}&code=${req.query.vnp_ResponseCode || 'unknown'}`;
        console.log('Redirecting to error page:', errorRedirectUrl);
        return res.redirect(errorRedirectUrl);
      }
    } catch (error) {
      console.error('Error handling VNPay return:', error);
      const errorRedirectUrl = `/payment/error?message=${encodeURIComponent(error.message)}`;
      console.log('Redirecting to error page due to exception:', errorRedirectUrl);
      return res.redirect(errorRedirectUrl);
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
      console.error('Lỗi lấy danh sách ngân hàng:', error);
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
      console.error('Lỗi truy vấn giao dịch:', error);
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
      
      if (!payment) {
        return ApiResponse.notFound(res, 'Không tìm thấy giao dịch');
      }
      
      // Sử dụng vnpayService để yêu cầu hoàn tiền
      const result = await vnpayService.refundTransaction(
        payment.transactionId, 
        amount || payment.totalAmount, 
        reason, 
        userId
      );
      
      return ApiResponse.success(res, result);
    } catch (error) {
      console.error('Lỗi yêu cầu hoàn tiền:', error);
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Xử lý IPN từ cổng VNPay
   * @route POST /api/payments/vnpay/ipn
   * @access Public
   */
  async handleVNPayIPN(req, res) {
    try {
      console.log('VNPay IPN received:', req.query);
      
      // Xác thực và xử lý IPN
      const result = await vnpayService.verifyIPN(req.query);
      
      // Trả về kết quả cho VNPay theo định dạng yêu cầu
      return res.status(200).json({
        RspCode: result.RspCode,
        Message: result.Message
      });
    } catch (error) {
      console.error('Error handling VNPay IPN:', error);
      // Vẫn trả về mã lỗi cho VNPay
      return res.status(200).json({ 
        RspCode: '99', 
        Message: 'Unknown error' 
      });
    }
  }
};

module.exports = vnpayController; 