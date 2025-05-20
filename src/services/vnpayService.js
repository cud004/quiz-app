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

// Khởi tạo VNPay instance với cấu hình
const vnpayInstance = new VNPay({
  tmnCode: vnpayConfig.tmnCode,
  secureSecret: vnpayConfig.hashSecret,
  vnpayHost: vnpayConfig.vnpayHost,
  testMode: vnpayConfig.testMode,
  hashAlgorithm: vnpayConfig.hashAlgorithm,
  enableLog: vnpayConfig.enableLog,
  logLevel: vnpayConfig.logLevel
});

// Hàm retry với delay
const retryWithDelay = async (fn, maxRetries = vnpayConfig.maxRetries, delay = vnpayConfig.retryDelay) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`Retry attempt ${i + 1} failed:`, error);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

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
    try {
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
    } catch (error) {
      console.error('Error creating VNPay signature:', error);
      throw new Error('Lỗi tạo chữ ký VNPay');
    }
  },

  /**
   * Xác thực chữ ký từ VNPay
   * @param {Object} params - Tham số cần xác thực
   * @returns {boolean} Kết quả xác thực
   */
  verifySignature(params) {
    try {
      // Clone params để không làm thay đổi object gốc
      const paramsCopy = { ...params };
      const vnp_SecureHash = paramsCopy.vnp_SecureHash;
      delete paramsCopy.vnp_SecureHash;
      delete paramsCopy.vnp_SecureHashType; // Loại bỏ luôn nếu có

      // Sắp xếp tham số theo alphabet và loại bỏ các tham số rỗng
      const sortedParams = {};
      Object.keys(paramsCopy)
        .filter(key => paramsCopy[key] !== '' && paramsCopy[key] !== undefined && paramsCopy[key] !== null)
        .sort()
        .forEach(key => {
          sortedParams[key] = paramsCopy[key].toString();
        });
      const signData = require('qs').stringify(sortedParams, { encode: false });
      const hashSecret = require('../config/vnpay').hashSecret;
      const hmac = require('crypto').createHmac('sha512', hashSecret);
      const calculatedSignature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
      // Log chi tiết để debug
      console.log('--- VNPay Signature Debug ---');
      console.log('Params for signature:', sortedParams);
      console.log('SignData:', signData);
      console.log('HashSecret:', hashSecret);
      console.log('Calculated signature:', calculatedSignature);
      console.log('VNPay signature:', vnp_SecureHash);
      console.log('-----------------------------');
      return calculatedSignature === vnp_SecureHash;
    } catch (error) {
      console.error('Error verifying VNPay signature:', error);
      return false;
    }
  },

  /**
   * Tạo thanh toán mới
   * @param {string} userId - ID người dùng
   * @param {string} packageId - ID gói đăng ký
   * @param {Object} options - Tùy chọn thanh toán
   * @returns {Promise<Object>} Kết quả tạo thanh toán
   */
  async createPayment(userId, packageId, options = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate input
      if (!userId || !packageId) {
        throw new Error('Thiếu thông tin người dùng hoặc gói đăng ký');
      }

      // Lấy thông tin gói
      const packageInfo = await SubscriptionPackage.findById(packageId);
      if (!packageInfo) {
        throw new Error('Không tìm thấy gói đăng ký');
      }

      // Tạo transaction ID
      const transactionId = crypto.randomBytes(16).toString('hex');
      
      // Tạo return URL
      const returnUrl = options.returnUrl || vnpayConfig.returnUrl;
      console.log('Return URL:', returnUrl);

      // Tạo payment record
      const payment = await Payment.create([{
        user: userId,
        subscription: {
          package: packageId,
          duration: packageInfo.duration,
          price: packageInfo.price
        },
        totalAmount: packageInfo.price,
        paymentMethod: 'vnpay',
        transactionId: transactionId,
        status: 'PENDING',
        paymentDetails: {
          description: `Thanh toán gói ${packageInfo.name} - ${packageInfo.duration} tháng`,
          returnUrl: returnUrl,
          ipAddress: options.ipAddress || '127.0.0.1',
          bankCode: options.bankCode || '',
          orderInfo: `Thanh toan goi ${packageInfo.name}`,
          requestId: crypto.randomBytes(16).toString('hex')
        },
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }], { session });

      // Sử dụng thư viện vnpay để tạo URL thanh toán
      try {
        const vnpAmount = calculateGatewayAmount(payment[0].totalAmount, 'vnpay');
        const now = new Date();
        const vnpCreateDate = dateFormat(now, 'yyyyMMddHHmmss');
        const vnpExpireDate = dateFormat(new Date(now.getTime() + 15 * 60 * 1000), 'yyyyMMddHHmmss');
        // Đảm bảo luôn có orderInfo
        const orderInfo = payment[0].paymentDetails.orderInfo || `Thanh toán gói ${packageInfo.name}`;
        // Đảm bảo IP là IPv4
        let ipAddr = payment[0].paymentDetails.ipAddress;
        if (!ipAddr || ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') ipAddr = '127.0.0.1';

        const paymentUrl = await retryWithDelay(async () => {
          return await vnpayInstance.buildPaymentUrl({
            vnp_Amount: vnpAmount,
            vnp_IpAddr: ipAddr,
            vnp_TxnRef: payment[0].transactionId,
            vnp_OrderInfo: orderInfo,
            vnp_ReturnUrl: payment[0].paymentDetails.returnUrl,
            vnp_BankCode: payment[0].paymentDetails.bankCode || undefined,
            vnp_ExpireDate: vnpExpireDate,
            vnp_CreateDate: vnpCreateDate,
            vnp_OrderType: 'billpayment' // Sử dụng loại hợp lệ
          });
        });

        await session.commitTransaction();
        
        return {
          success: true,
          paymentId: payment[0]._id,
          paymentUrl: paymentUrl,
          transactionId: transactionId,
          requiresPayment: true
        };
      } catch (error) {
        console.error('Error creating VNPay payment URL:', error);
        await session.abortTransaction();
        throw new Error(`Lỗi tạo URL thanh toán VNPay: ${error.message}`);
      }
    } catch (error) {
      await session.abortTransaction();
      console.error('Error in createPayment:', error);
      throw error;
    } finally {
      session.endSession();
    }
  },

  /**
   * Xác thực và xử lý callback từ VNPay
   * @param {Object} vnpParams - Tham số từ VNPay
   * @returns {Promise<Object>} Kết quả xử lý
   */
  async verifyReturnUrl(vnpParams) {
    const session = await mongoose.startSession();
    session.startTransaction();

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
        .populate('user subscription.package')
        .session(session);

      if (!payment) {
        console.error(`Payment not found for transaction: ${transactionId}`);
        throw new Error('Không tìm thấy giao dịch');
      }

      // Kiểm tra trạng thái hiện tại
      if (payment.status === 'SUCCESS') {
        console.log(`Payment ${transactionId} already processed`);
        await session.commitTransaction();
        return {
          success: true,
          payment,
          message: 'Giao dịch đã được xử lý trước đó'
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

      // Cập nhật trạng thái thanh toán
      if (responseCode === '00') {
        payment.status = 'SUCCESS';
        
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
          throw error;
        }
      } else {
        payment.status = 'FAILED';
        console.log(`Payment failed with response code: ${responseCode}`);
      }

      await payment.save({ session });
      await session.commitTransaction();

      return {
        success: responseCode === '00',
        payment,
        message: responseCode === '00' ? 'Thanh toán thành công' : 'Thanh toán thất bại'
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Error processing VNPay return:', error);
      throw error;
    } finally {
      session.endSession();
    }
  },

  /**
   * Xử lý IPN từ VNPay
   * @param {Object} params - Tham số từ VNPay
   * @returns {Promise<Object>} Kết quả xử lý
   */
  async handleIPN(params) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Xác thực chữ ký
      if (!this.verifySignature(params)) {
        throw new Error('Chữ ký không hợp lệ');
      }

      const payment = await Payment.findOne({ transactionId: params.vnp_TxnRef })
        .session(session);

      if (!payment) {
        throw new Error('Không tìm thấy giao dịch');
      }

      // Kiểm tra trạng thái hiện tại
      if (payment.status === 'SUCCESS') {
        console.log(`Payment ${params.vnp_TxnRef} already processed`);
        await session.commitTransaction();
        return {
          success: true,
          payment,
          message: 'Giao dịch đã được xử lý trước đó'
        };
      }

      // Cập nhật trạng thái giao dịch
      payment.status = params.vnp_ResponseCode === '00' ? 'SUCCESS' : 'FAILED';
      payment.paymentDetails.ipnResponse = params;
      payment.paymentDetails.ipnProcessedAt = new Date();

      // Nếu thanh toán thành công, kích hoạt gói đăng ký
      if (payment.status === 'SUCCESS') {
        try {
          await subscriptionService.subscribePackage(
            payment.user,
            payment.subscription.package,
            {
              transactionId: payment.transactionId,
              amount: payment.totalAmount
            }
          );
        } catch (error) {
          console.error('Error activating subscription from IPN:', error);
          payment.paymentDetails.error = error.message;
          throw error;
        }
      }

      await payment.save({ session });
      await session.commitTransaction();

      return {
        success: true,
        payment,
        message: payment.status === 'SUCCESS' ? 'Thanh toán thành công' : 'Thanh toán thất bại'
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Error processing VNPay IPN:', error);
      throw error;
    } finally {
      session.endSession();
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
          if (payment.status !== 'SUCCESS' && queryResult.vnp_TransactionStatus === '00') {
            payment.status = 'SUCCESS';
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

      if (payment.status !== 'SUCCESS') {
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
          payment.status = 'SUCCESS';
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
   * Lấy danh sách ngân hàng hỗ trợ VNPay
   * @returns {Promise<Array>} Danh sách ngân hàng
   */
  async getSupportedBanks() {
    try {
      const response = await axios.get(`${vnpayConfig.vnpayHost}${vnpayConfig.endpoints.getBanks}`, {
        params: {
          merchantCode: vnpayConfig.tmnCode,
          timestamp: Date.now()
        }
      });

      if (response.data && response.data.banks) {
        return response.data.banks.map(bank => ({
          code: bank.bankCode,
          name: bank.bankName,
          logo: bank.bankLogo,
          shortName: bank.bankShortName
        }));
      }

      return [];
    } catch (error) {
      console.error('Lỗi lấy danh sách ngân hàng VNPay:', error);
      throw new Error('Không thể lấy danh sách ngân hàng');
    }
  }
};

module.exports = vnpayService;