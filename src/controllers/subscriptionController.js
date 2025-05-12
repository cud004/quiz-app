const subscriptionService = require('../services/subscriptionService');
const ApiResponse = require('../utils/apiResponse');
const User = require('../models/User');
const SubscriptionPackage = require('../models/SubscriptionPackage');

const subscriptionController = {
  /**
   * Lấy tất cả các gói đăng ký đang hoạt động
   * @route GET /api/subscriptions
   * @access Public
   */
  async getAllPackages(req, res) {
    try {
      const filters = req.query;
      const packages = await subscriptionService.getAllPackages(filters);
      return ApiResponse.success(res, packages);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Lấy thông tin chi tiết của một gói đăng ký
   * @route GET /api/subscriptions/id/:id
   * @access Public
   */
  async getPackageById(req, res) {
    try {
      const { id } = req.params;
      const packageDetails = await subscriptionService.getPackageById(id);
      return ApiResponse.success(res, packageDetails);
    } catch (error) {
      return error.message.includes('không hợp lệ') 
        ? ApiResponse.badRequest(res, error.message)
        : ApiResponse.notFound(res, error.message);
    }
  },
  
  /**
   * Lấy thông tin gói đăng ký theo tên
   * @route GET /api/subscriptions/name/:name
   * @access Public
   */
  async getPackageByName(req, res) {
    try {
      const { name } = req.params;
      const packageDetails = await subscriptionService.getPackageByName(name);
      return ApiResponse.success(res, packageDetails);
    } catch (error) {
      return error.message.includes('không hợp lệ') 
        ? ApiResponse.badRequest(res, error.message)
        : ApiResponse.notFound(res, error.message);
    }
  },
  
  /**
   * Tạo gói đăng ký mới
   * @route POST /api/subscriptions
   * @access Admin
   */
  async createPackage(req, res) {
    try {
      const packageData = req.body;
      const newPackage = await subscriptionService.createPackage(packageData);
      return ApiResponse.created(res, newPackage);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Cập nhật thông tin gói đăng ký
   * @route PUT /api/subscriptions/:id
   * @access Admin
   */
  async updatePackage(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedPackage = await subscriptionService.updatePackage(id, updateData);
      return ApiResponse.success(res, updatedPackage);
    } catch (error) {
      return error.message.includes('không hợp lệ') 
        ? ApiResponse.badRequest(res, error.message)
        : ApiResponse.notFound(res, error.message);
    }
  },
  
  /**
   * Vô hiệu hóa gói đăng ký
   * @route PUT /api/subscriptions/:id/deactivate
   * @access Admin
   */
  async deactivatePackage(req, res) {
    try {
      const { id } = req.params;
      const result = await subscriptionService.deactivatePackage(id);
      return ApiResponse.success(res, result);
    } catch (error) {
      return error.message.includes('không hợp lệ') 
        ? ApiResponse.badRequest(res, error.message)
        : ApiResponse.notFound(res, error.message);
    }
  },
  
  /**
   * Kích hoạt lại gói đăng ký
   * @route PUT /api/subscriptions/:id/activate
   * @access Admin
   */
  async activatePackage(req, res) {
    try {
      const { id } = req.params;
      const result = await subscriptionService.activatePackage(id);
      return ApiResponse.success(res, result);
    } catch (error) {
      return error.message.includes('không hợp lệ') 
        ? ApiResponse.badRequest(res, error.message)
        : ApiResponse.notFound(res, error.message);
    }
  },
  
  /**
   * Lấy danh sách người dùng theo gói đăng ký
   * @route GET /api/subscriptions/users/:name
   * @access Admin
   */
  async getUsersByPackage(req, res) {
    try {
      const { name } = req.params;
      const { page, limit } = req.query;
      
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10
      };
      
      const result = await subscriptionService.getUsersByPackage(name, options);
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Lấy thống kê người dùng theo gói đăng ký
   * @route GET /api/subscriptions/statistics
   * @access Admin
   */
  async getPackageStatistics(req, res) {
    try {
      const statistics = await subscriptionService.getPackageStatistics();
      return ApiResponse.success(res, statistics);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },

  /**
   * Lấy thông tin gói đăng ký hiện tại của người dùng
   * @route GET /api/subscriptions/my-subscription
   * @access Private
   */
  async getMySubscription(req, res) {
    try {
      const userId = req.user._id;
      const subscription = await subscriptionService.getUserSubscription(userId);
      return ApiResponse.success(res, subscription);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Đăng ký gói mới
   * @route POST /api/subscriptions/subscribe/:packageId
   * @access Private
   */
  async subscribe(req, res) {
    try {
      const userId = req.user._id;
      const { packageId } = req.params;
      const paymentInfo = req.body || {};
      
      const result = await subscriptionService.subscribePackage(userId, packageId, paymentInfo);
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Hủy gói đăng ký hiện tại
   * @route POST /api/subscriptions/cancel
   * @access Private
   */
  async cancelSubscription(req, res) {
    try {
      const userId = req.user._id;
      const result = await subscriptionService.cancelSubscription(userId);
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Bật/tắt tự động gia hạn
   * @route PUT /api/subscriptions/auto-renew
   * @access Private
   */
  async toggleAutoRenew(req, res) {
    try {
      const userId = req.user._id;
      const { autoRenew } = req.body;
      
      // Kiểm tra tham số
      if (typeof autoRenew !== 'boolean') {
        return ApiResponse.badRequest(res, 'Tham số autoRenew phải là boolean (true/false)');
      }
      
      // Lấy thông tin người dùng
      const user = await User.findById(userId);
      
      if (!user) {
        return ApiResponse.notFound(res, 'Không tìm thấy người dùng');
      }
      
      // Kiểm tra nếu người dùng có gói đăng ký
      if (!user.subscription || !user.subscription.package) {
        return ApiResponse.badRequest(res, 'Bạn chưa đăng ký gói nào');
      }
      
      // Kiểm tra nếu là gói Free
      const subscriptionPackage = await SubscriptionPackage.findById(user.subscription.package);
      if (subscriptionPackage.name === 'free') {
        return ApiResponse.badRequest(res, 'Không thể thiết lập tự động gia hạn cho gói Free');
      }
      
      // Cập nhật trạng thái tự động gia hạn
      user.subscription.autoRenew = autoRenew;
      await user.save();
      
      return ApiResponse.success(res, {
        message: `Đã ${autoRenew ? 'bật' : 'tắt'} tự động gia hạn cho gói ${subscriptionPackage.name}`,
        autoRenew: user.subscription.autoRenew
      });
    } catch (error) {
      return ApiResponse.badRequest(res, error.message);
    }
  },
  
  /**
   * Kiểm tra và cập nhật các gói đăng ký đã hết hạn (chỉ Admin)
   * @route POST /api/subscriptions/check-expired
   * @access Admin
   */
  async checkExpiredSubscriptions(req, res) {
    try {
      const result = await subscriptionService.checkAndUpdateExpiredSubscriptions();
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  },
  
  /**
   * Xử lý tự động gia hạn gói đăng ký (chỉ Admin)
   * @route POST /api/subscriptions/process-renewals
   * @access Admin
   */
  async processAutoRenewals(req, res) {
    try {
      const result = await subscriptionService.processAutoRenewals();
      return ApiResponse.success(res, result);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
};

module.exports = subscriptionController; 