const momoService = require('../services/momoService');
const paymentService = require('../services/paymentService');
const ApiResponse = require('../utils/apiResponse');
const subscriptionService = require('../services/subscriptionService');

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
      console.log('MoMo redirect callback received:', req.query);
      
      // Xử lý callback từ MoMo
      // Lưu ý: MoMo trả về qua query params với GET chứ không phải POST body
      const result = await paymentService.handleMomoReturn(req.query);
      
      // Kiểm tra kết quả và chuyển hướng người dùng
      if (result.success) {
        const payment = result.payment;
        // Nếu có thông tin payment, lấy ra thông tin gói để hiển thị
        if (payment && payment.subscription && payment.subscription.package) {
          const packageInfo = payment.subscription.package;
          return res.redirect(`/payment/success?package=${packageInfo.name}&price=${payment.totalAmount}&transactionId=${payment.transactionId}`);
        }
        // Nếu không có thông tin đầy đủ, redirect với ít thông tin hơn
        return res.redirect(`/payment/success?transactionId=${req.query.orderId || 'unknown'}`);
      } else {
        // Xử lý trường hợp thất bại
        console.error('MoMo payment failed:', result);
        const errorMsg = result.message || 'Thanh toán thất bại';
        return res.redirect(`/payment/error?message=${encodeURIComponent(errorMsg)}&code=${req.query.resultCode || 'unknown'}`);
      }
    } catch (error) {
      console.error('Error handling MoMo redirect:', error);
      return res.redirect(`/payment/error?message=${encodeURIComponent(error.message)}`);
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
  },

  /**
   * Xử lý thông báo từ MoMo (IPN)
   * @route POST /api/payments/momo/notify
   * @access Public
   */
  async handleMomoNotify(req, res) {
    try {
      console.log('MoMo IPN received:', req.body);
      
      // Xác thực và xử lý IPN
      const result = await momoService.handleMomoIPN(req.body);
      
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
            
            console.log('Kích hoạt gói đăng ký thành công qua IPN MoMo');
          } catch (subError) {
            console.error('Lỗi khi kích hoạt gói đăng ký qua IPN MoMo:', subError);
            // Không trả về lỗi cho MoMo, chỉ ghi log
          }
        }
        
        // Trả về kết quả thành công cho MoMo
        return res.status(200).json({ 
          status: 0, 
          message: 'Confirm Success' 
        });
      } else {
        // IPN không hợp lệ
        console.error('MoMo IPN verification failed:', result);
        return res.status(200).json({ 
          status: 99, 
          message: 'Invalid Signature' 
        });
      }
    } catch (error) {
      console.error('Error handling MoMo IPN:', error);
      // Vẫn trả về mã lỗi cho MoMo
      return res.status(200).json({ 
        status: 99, 
        message: 'Unknown error' 
      });
    }
  }
};

module.exports = momoController; 