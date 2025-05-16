const { VNPay, dateFormat } = require('vnpay');
const vnpayConfig = require('../config/vnpay');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const User = require('../models/User');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const subscriptionService = require('./subscriptionService');
const { calculateGatewayAmount } = require('../utils/paymentUtils');
const crypto = require('crypto');
const qs = require('qs');
const axios = require('axios');
const AuthService = require('./auth/authService');

// Khởi tạo VNPay instance
const vnpayInstance = new VNPay({
  tmnCode: vnpayConfig.tmnCode,
  secureSecret: vnpayConfig.hashSecret,
  vnpayHost: vnpayConfig.vnpayHost,
  testMode: vnpayConfig.testMode,
  hashAlgorithm: vnpayConfig.hashAlgorithm,
  enableLog: vnpayConfig.enableLog
});

/**
 * Service xử lý thanh toán qua VNPay
 */
const vnpayService = {
  /**
   * Tạo chữ ký cho VNPay
   * @param {Object} params - Các tham số cần ký
   * @returns {string} Chữ ký
   */
  createSignature(params) {
    // Sắp xếp tham số theo alphabet và loại bỏ các tham số rỗng
    const sortedParams = {};
    Object.keys(params)
      .filter(key => params[key] !== '' && params[key] !== undefined && params[key] !== null)
      .sort()
      .forEach(key => {
        sortedParams[key] = params[key].toString();
      });

    // Tạo chuỗi ký
    const signData = qs.stringify(sortedParams, { encode: false });
    
    // Tạo chữ ký với SHA512
    const hmac = crypto.createHmac('sha512', vnpayConfig.hashSecret);
    return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  },

  /**
   * Xác thực chữ ký từ VNPay
   * @param {Object} params - Tham số từ VNPay
   * @returns {boolean} Kết quả xác thực
   */
  verifySignature(params) {
    const receivedHash = params.vnp_SecureHash;
    const secureHashType = params.vnp_SecureHashType;

    // Xóa các trường không cần thiết cho việc tạo chữ ký
    const verifyParams = { ...params };
    delete verifyParams.vnp_SecureHash;
    delete verifyParams.vnp_SecureHashType;

    // Tạo chữ ký mới và so sánh
    const calculatedHash = this.createSignature(verifyParams);
    return calculatedHash === receivedHash;
  },

  /**
   * Tạo phiên thanh toán mới cho VNPay
   * @param {string} userId - ID người dùng
   * @param {string} packageId - ID gói subscription
   * @param {object} options - Các tùy chọn bổ sung
   * @returns {object} URL thanh toán và thông tin phiên
   */
  async createPayment(userId, packageId, options = {}) {
    try {
      // Validate input
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('ID người dùng không hợp lệ');
      }
      if (!mongoose.Types.ObjectId.isValid(packageId)) {
        throw new Error('ID gói đăng ký không hợp lệ');
      }

      // Lấy thông tin người dùng và gói
      const [user, packageInfo] = await Promise.all([
        User.findById(userId),
        SubscriptionPackage.findById(packageId)
      ]);

      if (!user) throw new Error('Không tìm thấy người dùng');
      if (!packageInfo) throw new Error('Không tìm thấy gói đăng ký');
      if (!packageInfo.isActive) throw new Error('Gói đăng ký hiện không khả dụng');

      // Xử lý gói miễn phí
      if (packageInfo.price === 0) {
        const result = await subscriptionService.subscribePackage(userId, packageId);
        return {
          success: true,
          message: 'Đăng ký gói miễn phí thành công',
          requiresPayment: false,
          subscription: result
        };
      }

      // Tạo mã giao dịch
      const transactionId = `QUIZ_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Đảm bảo returnUrl luôn là URL tuyệt đối
      let returnUrl = options.returnUrl || vnpayConfig.returnUrl;
      // Kiểm tra xem returnUrl có phải là URL tuyệt đối không
      if (!returnUrl.startsWith('http://') && !returnUrl.startsWith('https://')) {
        // Nếu là đường dẫn tương đối, thêm domain
        returnUrl = `http://localhost:5000${returnUrl.startsWith('/') ? '' : '/'}${returnUrl}`;
      }
      console.log('Return URL đầy đủ:', returnUrl);

      // Tạo payment record
      const payment = await Payment.create({
        user: userId,
        subscription: {
          package: packageId,
          duration: packageInfo.duration,
          price: packageInfo.price
        },
        totalAmount: packageInfo.price,
        paymentMethod: 'vnpay',
        transactionId: transactionId,
        status: 'pending',
        paymentDetails: {
          description: `Thanh toán gói ${packageInfo.name} - ${packageInfo.duration} tháng`,
          returnUrl: returnUrl,
          ipAddress: options.ipAddress || '127.0.0.1',
          bankCode: options.bankCode || '',
          orderInfo: `Thanh toan goi ${packageInfo.name}`,
          requestId: crypto.randomBytes(16).toString('hex')
        }
      });

      // Sử dụng thư viện vnpay để tạo URL thanh toán
      try {
        // Sử dụng helper function để tính toán số tiền cho VNPay
        const vnpAmount = calculateGatewayAmount(payment.totalAmount, 'vnpay');
        
        const paymentUrl = await vnpayInstance.buildPaymentUrl({
          vnp_Amount: vnpAmount,
          vnp_IpAddr: payment.paymentDetails.ipAddress,
          vnp_TxnRef: payment.transactionId,
          vnp_OrderInfo: payment.paymentDetails.orderInfo,
          vnp_ReturnUrl: payment.paymentDetails.returnUrl, // Đã đảm bảo là URL tuyệt đối
          vnp_BankCode: payment.paymentDetails.bankCode || undefined,
          vnp_ExpireDate: dateFormat(new Date(Date.now() + 15 * 60 * 1000), 'yyyyMMddHHmmss')
        });

        console.log('Đã tạo payment URL:', {
          transactionId: payment.transactionId,
          returnUrl: payment.paymentDetails.returnUrl,
          paymentUrl: paymentUrl
        });

        return {
          success: true,
          paymentId: payment._id,
          paymentUrl: paymentUrl,
          transactionId: transactionId,
          requiresPayment: true
        };
      } catch (error) {
        console.error('Lỗi khi tạo URL thanh toán qua thư viện VNPAY:', error);
        // Nếu thư viện vnpay gặp lỗi, sử dụng cách thủ công
        const vnpAmount = calculateGatewayAmount(payment.totalAmount, 'vnpay');
        const vnpParams = {
          vnp_Version: vnpayConfig.apiVersion,
          vnp_Command: 'pay',
          vnp_TmnCode: vnpayConfig.tmnCode,
          vnp_Amount: vnpAmount,
          vnp_CreateDate: dateFormat(new Date(), 'yyyyMMddHHmmss'),
          vnp_CurrCode: vnpayConfig.currencyCode,
          vnp_IpAddr: payment.paymentDetails.ipAddress,
          vnp_Locale: vnpayConfig.locale,
          vnp_OrderInfo: payment.paymentDetails.orderInfo,
          vnp_OrderType: 'billpayment',
          vnp_ReturnUrl: payment.paymentDetails.returnUrl, // Đã đảm bảo là URL tuyệt đối
          vnp_TxnRef: payment.transactionId,
          vnp_ExpireDate: dateFormat(new Date(Date.now() + 15 * 60 * 1000), 'yyyyMMddHHmmss')
        };

        if (payment.paymentDetails.bankCode) {
          vnpParams.vnp_BankCode = payment.paymentDetails.bankCode;
        }

        // Tạo chữ ký
        vnpParams.vnp_SecureHash = this.createSignature(vnpParams);

        // Tạo URL thanh toán
        const paymentUrl = `${vnpayConfig.vnpayHost}${vnpayConfig.endpoints.payment}?${qs.stringify(vnpParams, { encode: true })}`;

        console.log('Đã tạo payment URL thủ công:', {
          transactionId: payment.transactionId,
          returnUrl: payment.paymentDetails.returnUrl,
          paymentUrl: paymentUrl
        });

        return {
          success: true,
          paymentId: payment._id,
          paymentUrl: paymentUrl,
          transactionId: transactionId,
          requiresPayment: true
        };
      }
    } catch (error) {
      throw new Error(`Lỗi tạo thanh toán VNPay: ${error.message}`);
    }
  },

  /**
   * Xác thực và xử lý callback từ VNPay
   * @param {Object} vnpParams - Tham số từ VNPay
   * @returns {Object} Kết quả xử lý
   */
  async verifyReturnUrl(vnpParams) {
    try {
      console.log('VNPay callback params:', JSON.stringify(vnpParams, null, 2));

      // Xác thực chữ ký
      if (!this.verifySignature(vnpParams)) {
        console.error('Invalid VNPay signature');
        throw new Error('Chữ ký không hợp lệ');
      }

      const transactionId = vnpParams.vnp_TxnRef;
      const responseCode = vnpParams.vnp_ResponseCode;

      console.log(`Processing VNPay transaction: ${transactionId}, response code: ${responseCode}`);

      const payment = await Payment.findOne({ transactionId })
        .populate('user subscription.package');

      if (!payment) {
        console.error(`Payment not found for transaction: ${transactionId}`);
        throw new Error('Không tìm thấy giao dịch');
      }

      console.log(`Found payment record:`, {
        id: payment._id,
        userId: payment.user?._id,
        packageId: payment.subscription?.package?._id,
        status: payment.status
      });

      // Cập nhật thông tin thanh toán
      payment.paymentDetails = {
        ...payment.paymentDetails,
        responseCode: responseCode,
        bankCode: vnpParams.vnp_BankCode,
        bankTranNo: vnpParams.vnp_BankTranNo,
        cardType: vnpParams.vnp_CardType,
        payDate: vnpParams.vnp_PayDate ? dateFormat(vnpParams.vnp_PayDate, 'yyyy-MM-dd HH:mm:ss') : new Date().toISOString(),
        gatewayResponse: vnpParams
      };

      // Cập nhật trạng thái thanh toán
      if (responseCode === '00') {
        payment.status = 'completed';
        
        // Kích hoạt gói đăng ký
        try {
          console.log(`Activating subscription for user: ${payment.user._id}, package: ${payment.subscription.package._id}`);
          
          await subscriptionService.subscribePackage(
            payment.user._id,
            payment.subscription.package._id,
            {
              transactionId: payment.transactionId,
              amount: payment.totalAmount
            }
          );
          
          console.log('Subscription activated successfully');
        } catch (error) {
          console.error('Error activating subscription:', error);
          payment.paymentDetails.error = error.message;
        }
      } else {
        payment.status = 'failed';
        console.log(`Payment failed with response code: ${responseCode}`);
      }

      await payment.save();
      console.log(`Payment record updated successfully. New status: ${payment.status}`);

      return {
        success: responseCode === '00',
        payment,
        message: responseCode === '00' ? 'Thanh toán thành công' : 'Thanh toán thất bại'
      };
    } catch (error) {
      console.error('Error processing VNPay return:', error);
      throw error;
    }
  },

  /**
   * Xử lý IPN từ VNPay
   * @param {Object} vnpParams - Tham số từ VNPay
   * @returns {Object} Kết quả xử lý
   */
  async verifyIPN(vnpParams) {
    try {
      // Xác thực chữ ký
      if (!this.verifySignature(vnpParams)) {
        return {
          RspCode: '97',
          Message: 'Chu ky khong hop le'
        };
      }

      const transactionId = vnpParams.vnp_TxnRef;
      const responseCode = vnpParams.vnp_ResponseCode;

      // Kiểm tra giao dịch
      const payment = await Payment.findOne({ transactionId }).populate('user subscription.package');
      if (!payment) {
        return {
          RspCode: '01',
          Message: 'Khong tim thay giao dich'
        };
      }

      // Kiểm tra trạng thái
      if (payment.status === 'completed') {
        return {
          RspCode: '02',
          Message: 'Giao dich da duoc xu ly'
        };
      }

      // Cập nhật thông tin thanh toán
      payment.paymentDetails = {
        ...payment.paymentDetails,
        responseCode: responseCode,
        bankCode: vnpParams.vnp_BankCode,
        bankTranNo: vnpParams.vnp_BankTranNo,
        cardType: vnpParams.vnp_CardType,
        payDate: vnpParams.vnp_PayDate ? dateFormat(vnpParams.vnp_PayDate, 'yyyy-MM-dd HH:mm:ss') : new Date().toISOString(),
        gatewayResponse: vnpParams
      };

      if (responseCode === '00') {
        payment.status = 'completed';
        
        // Kích hoạt gói đăng ký
        try {
          await subscriptionService.subscribePackage(
            payment.user._id,
            payment.subscription.package._id,
            {
              transactionId: payment.transactionId,
              amount: payment.totalAmount
            }
          );
        } catch (error) {
          console.error('Lỗi kích hoạt gói đăng ký qua IPN:', error);
          payment.paymentDetails.error = error.message;
        }
      } else {
        payment.status = 'failed';
      }

      await payment.save();

      return {
        RspCode: '00',
        Message: 'Confirm Success'
      };
    } catch (error) {
      console.error('Lỗi xử lý IPN:', error);
      return {
        RspCode: '99',
        Message: 'Loi khong xac dinh'
      };
    }
  },

  /**
   * Truy vấn thông tin giao dịch
   * @param {string} transactionId - Mã giao dịch
   * @returns {Object} Thông tin giao dịch
   */
  async queryTransaction(transactionId) {
    try {
      // Kiểm tra giao dịch trong database trước
      const payment = await Payment.findOne({ transactionId }).populate('user subscription.package');
      
      if (!payment) {
        throw new Error('Không tìm thấy giao dịch');
      }

      // Sử dụng thư viện vnpay để truy vấn thông tin giao dịch
      try {
        const queryResult = await vnpayInstance.queryDr({
          vnp_TxnRef: transactionId,
          vnp_OrderInfo: `Truy van giao dich ${transactionId}`,
          vnp_TransactionDate: dateFormat(new Date(), 'yyyyMMddHHmmss')
        });

        // Cập nhật thông tin giao dịch nếu cần
        if (queryResult.vnp_ResponseCode === '00') {
          // Nếu giao dịch thành công trên VNPay nhưng chưa cập nhật trong hệ thống
          if (payment.status !== 'completed' && queryResult.vnp_TransactionStatus === '00') {
            payment.status = 'completed';
            payment.paymentDetails = {
              ...payment.paymentDetails,
              responseCode: queryResult.vnp_ResponseCode,
              bankTranNo: queryResult.vnp_BankTranNo,
              cardType: queryResult.vnp_CardType,
              payDate: queryResult.vnp_PayDate ? dateFormat(queryResult.vnp_PayDate, 'yyyy-MM-dd HH:mm:ss') : new Date().toISOString(),
              gatewayResponse: queryResult
            };

            // Kích hoạt gói đăng ký nếu chưa được kích hoạt
            try {
              await subscriptionService.subscribePackage(
                payment.user._id,
                payment.subscription.package._id,
                {
                  transactionId: payment.transactionId,
                  amount: payment.totalAmount
                }
              );
            } catch (error) {
              console.error('Lỗi kích hoạt gói đăng ký khi truy vấn:', error);
              payment.paymentDetails.error = error.message;
            }

            await payment.save();
          }
        }

        return {
          success: true,
          payment,
          vnpayResponse: queryResult
        };
      } catch (error) {
        // Nếu không thể truy vấn từ VNPay, trả về thông tin từ database
        console.error('Không thể truy vấn từ VNPay:', error.message);
        return {
          success: true,
          payment,
          message: 'Không thể truy vấn từ VNPay, trả về thông tin từ database',
          error: error.message
        };
      }
    } catch (error) {
      throw new Error(`Lỗi truy vấn giao dịch: ${error.message}`);
    }
  },

  /**
   * Yêu cầu hoàn tiền
   * @param {string} transactionId - Mã giao dịch
   * @param {number} amount - Số tiền hoàn trả
   * @param {string} reason - Lý do hoàn tiền
   * @param {string} userId - ID người dùng yêu cầu hoàn tiền
   * @returns {Object} Kết quả hoàn tiền
   */
  async refundTransaction(transactionId, amount, reason, userId) {
    try {
      // Kiểm tra giao dịch
      const payment = await Payment.findOne({ transactionId }).populate('user subscription.package');
      
      if (!payment) {
        throw new Error('Không tìm thấy giao dịch');
      }

      if (payment.status !== 'completed') {
        throw new Error('Chỉ có thể hoàn tiền cho giao dịch đã hoàn thành');
      }

      // Kiểm tra quyền (chỉ người dùng tạo giao dịch hoặc admin có thể hoàn tiền)
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Không tìm thấy người dùng');
      }

      if (payment.user.toString() !== userId && !user.role.includes('admin')) {
        throw new Error('Bạn không có quyền hoàn tiền cho giao dịch này');
      }

      // Kiểm tra số tiền hoàn trả
      if (!amount || amount <= 0 || amount > payment.totalAmount) {
        throw new Error('Số tiền hoàn trả không hợp lệ');
      }

      // Sử dụng thư viện vnpay để yêu cầu hoàn tiền
      try {
        const refundResult = await vnpayInstance.refund({
          vnp_TxnRef: transactionId,
          vnp_Amount: calculateGatewayAmount(amount, 'vnpay'),
          vnp_TransactionDate: payment.paymentDetails.payDate ? 
            dateFormat(new Date(payment.paymentDetails.payDate), 'yyyyMMddHHmmss') : 
            dateFormat(new Date(), 'yyyyMMddHHmmss'),
          vnp_TransactionType: '02', // 02 là hoàn tiền
          vnp_OrderInfo: reason || `Hoan tien giao dich ${transactionId}`
        });

        if (refundResult.vnp_ResponseCode === '00') {
          // Cập nhật trạng thái giao dịch
          payment.status = 'refunded';
          payment.paymentDetails.refund = {
            amount: amount,
            reason: reason,
            date: new Date(),
            requestedBy: userId,
            responseCode: refundResult.vnp_ResponseCode,
            responseMessage: refundResult.vnp_Message,
            gatewayResponse: refundResult
          };

          // Hủy gói đăng ký
          try {
            await subscriptionService.cancelSubscription(
              payment.user._id,
              payment.subscription.package._id,
              {
                reason: 'refund',
                refundAmount: amount,
                transactionId: payment.transactionId
              }
            );
          } catch (error) {
            console.error('Lỗi hủy gói đăng ký khi hoàn tiền:', error);
            payment.paymentDetails.refund.error = error.message;
          }

          await payment.save();

          return {
            success: true,
            message: 'Hoàn tiền thành công',
            payment,
            vnpayResponse: refundResult
          };
        } else {
          throw new Error(`Hoàn tiền thất bại: ${refundResult.vnp_Message}`);
        }
      } catch (error) {
        throw new Error(`Lỗi yêu cầu hoàn tiền: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Lỗi hoàn tiền: ${error.message}`);
    }
  },

  /**
   * Lấy danh sách ngân hàng hỗ trợ
   * @returns {Array} Danh sách ngân hàng
   */
  async getBankList() {
    try {
      const response = await vnpayInstance.getBankList();
      return response.data;
    } catch (error) {
      throw new Error('Không thể lấy danh sách ngân hàng: ' + error.message);
    }
  }
};

module.exports = vnpayService;