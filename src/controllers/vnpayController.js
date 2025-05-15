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
   * Xử lý callback từ cổng VNPay
   * @route GET /api/payments/vnpay/return
   * @access Public
   */
  async handleVNPayReturn(req, res) {
    try {
      console.log('VNPay return callback received:', req.query);
      
      // Xử lý callback qua service
      const result = await paymentService.handleVNPayReturn(req.query);
      
      // Kiểm tra kết quả và chuyển hướng người dùng
      if (result.success) {
        const payment = result.payment;
        // Nếu có thông tin payment, lấy ra thông tin gói để hiển thị
        if (payment && payment.subscription && payment.subscription.package) {
          const packageInfo = payment.subscription.package;
          return res.redirect(`/payment/success?package=${packageInfo.name}&price=${payment.totalAmount}&transactionId=${payment.transactionId}`);
        }
        // Nếu không có thông tin đầy đủ, redirect với ít thông tin hơn
        return res.redirect(`/payment/success?transactionId=${req.query.vnp_TxnRef || 'unknown'}`);
      } else {
        // Xử lý trường hợp thất bại
        console.error('VNPay payment failed:', result);
        const errorMsg = result.message || 'Thanh toán thất bại';
        return res.redirect(`/payment/error?message=${encodeURIComponent(errorMsg)}&code=${req.query.vnp_ResponseCode || 'unknown'}`);
      }
    } catch (error) {
      console.error('Error handling VNPay return:', error);
      return res.redirect(`/payment/error?message=${encodeURIComponent(error.message)}`);
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
      
      if (result.success) {
        // IPN hợp lệ, kiểm tra nếu payment thành công thì kích hoạt gói đăng ký
        const payment = result.payment;
        
        if (payment.status === 'completed' && payment.user && payment.subscription && payment.subscription.package) {
          // Kích hoạt gói đăng ký
          try {
            console.log(`Kích hoạt gói đăng ký qua IPN cho user ${payment.user._id}, package ${payment.subscription.package._id}`);
            
            await subscriptionService.subscribePackage(
              payment.user._id,
              payment.subscription.package._id,
              {
                transactionId: payment.transactionId,
                amount: payment.totalAmount
              }
            );
            
            console.log('Kích hoạt gói đăng ký thành công qua IPN');
          } catch (subError) {
            console.error('Lỗi khi kích hoạt gói đăng ký qua IPN:', subError);
            // Không trả về lỗi cho VNPay, chỉ ghi log
          }
        }
        
        // Trả về kết quả thành công cho VNPay
        return res.status(200).json({ 
          RspCode: '00', 
          Message: 'Confirm Success' 
        });
      } else {
        // IPN không hợp lệ
        console.error('VNPay IPN verification failed:', result);
        return res.status(200).json({ 
          RspCode: '99', 
          Message: 'Invalid Signature' 
        });
      }
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