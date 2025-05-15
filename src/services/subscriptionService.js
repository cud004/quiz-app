const mongoose = require('mongoose');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const User = require('../models/User');
const Payment = require('../models/Payment');
const AuthService = require('../services/auth/authService');

const subscriptionService = {
  /**
   * Lấy tất cả các gói đăng ký đang hoạt động
   * @param {Object} filters - Các bộ lọc (tùy chọn)
   * @returns {Array} Danh sách các gói đăng ký
   */
  async getAllPackages(filters = {}) {
    // Mặc định chỉ lấy các gói đang hoạt động
    const defaultFilter = { isActive: true };
    
    // Kết hợp với các bộ lọc bổ sung (nếu có)
    const query = { ...defaultFilter, ...filters };
    
    // Lấy danh sách gói và sắp xếp theo giá tăng dần
    const packages = await SubscriptionPackage.find(query).sort({ price: 1 });
    
    return packages;
  },
  
  /**
   * Lấy thông tin chi tiết của một gói đăng ký
   * @param {string} packageId - ID của gói đăng ký
   * @returns {Object} Thông tin chi tiết gói đăng ký
   */
  async getPackageById(packageId) {
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      throw new Error('ID gói đăng ký không hợp lệ');
    }
    
    // Lấy thông tin gói
    const packageDetails = await SubscriptionPackage.findById(packageId);
    
    // Kiểm tra nếu không tìm thấy
    if (!packageDetails) {
      throw new Error('Không tìm thấy gói đăng ký');
    }
    
    return packageDetails;
  },
  
  /**
   * Lấy thông tin gói đăng ký theo tên
   * @param {string} packageName - Tên gói đăng ký (free, premium, pro)
   * @returns {Object} Thông tin chi tiết gói đăng ký
   */
  async getPackageByName(packageName) {
    // Kiểm tra tên hợp lệ
    if (!['free', 'premium', 'pro'].includes(packageName)) {
      throw new Error('Tên gói đăng ký không hợp lệ');
    }
    
    // Lấy thông tin gói
    const packageDetails = await SubscriptionPackage.findOne({ 
      name: packageName,
      isActive: true
    });
    
    // Kiểm tra nếu không tìm thấy
    if (!packageDetails) {
      throw new Error('Không tìm thấy gói đăng ký hoặc gói không hoạt động');
    }
    
    return packageDetails;
  },
  
  /**
   * Tạo gói đăng ký mới (chỉ admin)
   * @param {Object} packageData - Dữ liệu gói đăng ký
   * @returns {Object} Gói đăng ký đã tạo
   */
  async createPackage(packageData) {
    // Kiểm tra nếu gói với tên này đã tồn tại
    const existingPackage = await SubscriptionPackage.findOne({ name: packageData.name });
    
    if (existingPackage) {
      throw new Error(`Gói đăng ký "${packageData.name}" đã tồn tại`);
    }
    
    // Tạo gói đăng ký mới
    const newPackage = await SubscriptionPackage.create(packageData);
    
    return newPackage;
  },
  
  /**
   * Cập nhật thông tin gói đăng ký (chỉ admin)
   * @param {string} packageId - ID của gói đăng ký
   * @param {Object} updateData - Dữ liệu cập nhật
   * @returns {Object} Gói đăng ký đã cập nhật
   */
  async updatePackage(packageId, updateData) {
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      throw new Error('ID gói đăng ký không hợp lệ');
    }
    
    // Tìm và cập nhật gói
    const updatedPackage = await SubscriptionPackage.findByIdAndUpdate(
      packageId,
      updateData,
      { new: true, runValidators: true }
    );
    
    // Kiểm tra nếu không tìm thấy
    if (!updatedPackage) {
      throw new Error('Không tìm thấy gói đăng ký');
    }
    
    return updatedPackage;
  },
  
  /**
   * Vô hiệu hóa gói đăng ký (chỉ admin)
   * @param {string} packageId - ID của gói đăng ký
   * @returns {Object} Kết quả vô hiệu hóa
   */
  async deactivatePackage(packageId) {
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      throw new Error('ID gói đăng ký không hợp lệ');
    }
    
    // Không thể vô hiệu hóa gói Free
    const packageInfo = await SubscriptionPackage.findById(packageId);
    
    if (!packageInfo) {
      throw new Error('Không tìm thấy gói đăng ký');
    }
    
    if (packageInfo.name === 'free') {
      throw new Error('Không thể vô hiệu hóa gói Free');
    }
    
    // Cập nhật trạng thái gói
    const deactivatedPackage = await SubscriptionPackage.findByIdAndUpdate(
      packageId,
      { isActive: false },
      { new: true }
    );
    
    return { 
      success: true, 
      message: `Gói đăng ký "${deactivatedPackage.name}" đã bị vô hiệu hóa`,
      package: deactivatedPackage
    };
  },
  
  /**
   * Kích hoạt lại gói đăng ký (chỉ admin)
   * @param {string} packageId - ID của gói đăng ký
   * @returns {Object} Kết quả kích hoạt
   */
  async activatePackage(packageId) {
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      throw new Error('ID gói đăng ký không hợp lệ');
    }
    
    // Cập nhật trạng thái gói
    const activatedPackage = await SubscriptionPackage.findByIdAndUpdate(
      packageId,
      { isActive: true },
      { new: true }
    );
    
    // Kiểm tra nếu không tìm thấy
    if (!activatedPackage) {
      throw new Error('Không tìm thấy gói đăng ký');
    }
    
    return { 
      success: true, 
      message: `Gói đăng ký "${activatedPackage.name}" đã được kích hoạt`,
      package: activatedPackage
    };
  },
  
  /**
   * Lấy danh sách người dùng theo gói đăng ký (chỉ admin)
   * @param {string} packageName - Tên gói đăng ký (free, premium, pro)
   * @param {Object} options - Tùy chọn phân trang
   * @returns {Object} Danh sách người dùng và thông tin phân trang
   */
  async getUsersByPackage(packageName, options = {}) {
    // Kiểm tra tên hợp lệ
    if (!['free', 'premium', 'pro'].includes(packageName)) {
      throw new Error('Tên gói đăng ký không hợp lệ');
    }
    
    // Lấy thông tin gói
    const packageInfo = await SubscriptionPackage.findOne({ name: packageName });
    
    if (!packageInfo) {
      throw new Error('Không tìm thấy gói đăng ký');
    }
    
    // Tìm người dùng có gói đăng ký tương ứng
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;
    
    // Điều kiện tìm kiếm
    let query = {};
    
    if (packageName === 'free') {
      // Người dùng không có gói đăng ký hoặc gói đã hết hạn
      query = {
        $or: [
          { 'subscription.package': { $exists: false } },
          { 'subscription.status': 'expired' }
        ]
      };
    } else {
      // Người dùng có gói đăng ký đang hoạt động và là gói cần tìm
      query = {
        'subscription.package': packageInfo._id,
        'subscription.status': 'active'
      };
    }
    
    // Thực hiện truy vấn với phân trang
    const users = await User.find(query)
      .select('name email subscription')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    // Đếm tổng số người dùng
    const total = await User.countDocuments(query);
    
    // Tính toán thông tin phân trang
    return {
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    };
  },
  
  /**
   * Lấy thống kê người dùng theo gói đăng ký (chỉ admin)
   * @returns {Object} Thống kê theo gói
   */
  async getPackageStatistics() {
    // Lấy danh sách gói đăng ký
    const packages = await SubscriptionPackage.find();
    
    // Tạo map gói đăng ký
    const packageMap = {};
    packages.forEach(pkg => {
      packageMap[pkg._id.toString()] = pkg.name;
    });
    
    // Thống kê người dùng theo trạng thái gói đăng ký
    const userStats = await User.aggregate([
      {
        $group: {
          _id: {
            package: '$subscription.package',
            status: '$subscription.status'
          },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Khởi tạo kết quả
    const result = {
      free: 0,
      premium: 0,
      pro: 0,
      active: 0,
      expired: 0,
      cancelled: 0
    };
    
    // Xử lý kết quả thống kê
    userStats.forEach(stat => {
      // Xác định loại gói
      let packageType = 'free';
      
      if (stat._id.package && packageMap[stat._id.package.toString()]) {
        packageType = packageMap[stat._id.package.toString()];
      }
      
      // Cập nhật thống kê theo loại gói
      result[packageType] = (result[packageType] || 0) + stat.count;
      
      // Cập nhật thống kê theo trạng thái
      if (stat._id.status) {
        result[stat._id.status] = (result[stat._id.status] || 0) + stat.count;
      } else if (packageType === 'free') {
        // Người dùng không có trạng thái gói được tính là free
        result.free += stat.count;
      }
    });
    
    return result;
  },

  /**
   * Lấy thông tin gói đăng ký hiện tại của người dùng
   * @param {string} userId - ID của người dùng
   * @returns {Object} Thông tin gói đăng ký
   */
  async getUserSubscription(userId) {
    // Kiểm tra ID hợp lệ
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('ID người dùng không hợp lệ');
    }
    
    // Lấy thông tin người dùng với đầy đủ thông tin subscription
    const user = await User.findById(userId)
      .select('subscription')
      .populate({
        path: 'subscription.package',
        select: 'name price duration features description isActive'
      });
    
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }
    
    // Kiểm tra nếu người dùng chưa có gói đăng ký
    if (!user.subscription || !user.subscription.package) {
      // Lấy gói Free
      const freePackage = await SubscriptionPackage.findOne({ name: 'free' });
      
      return {
        package: freePackage,
        status: 'free',
        startDate: null,
        endDate: null,
        isActive: true,
        autoRenew: false,
        paymentHistory: []
      };
    }
    
    // Trả về thông tin đầy đủ về gói đăng ký
    return {
      package: user.subscription.package,
      status: user.subscription.status,
      startDate: user.subscription.startDate,
      endDate: user.subscription.endDate,
      isActive: user.subscription.status === 'active',
      autoRenew: user.subscription.autoRenew || false,
      paymentHistory: user.subscription.paymentHistory || []
    };
  },
  
  /**
   * Đăng ký gói mới cho người dùng
   * @param {string} userId - ID của người dùng
   * @param {string} packageId - ID của gói đăng ký
   * @param {Object} paymentInfo - Thông tin thanh toán (tùy chọn)
   * @returns {Object} Kết quả đăng ký
   */
  async subscribePackage(userId, packageId, paymentInfo = {}) {
    // Kiểm tra ID người dùng hợp lệ
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('ID người dùng không hợp lệ');
    }
    
    // Kiểm tra ID gói đăng ký hợp lệ
    if (!mongoose.Types.ObjectId.isValid(packageId)) {
      throw new Error('ID gói đăng ký không hợp lệ');
    }
    
    // Lấy thông tin người dùng
    const user = await User.findById(userId).populate('subscription.package');
    
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }
    
    // Lấy thông tin gói đăng ký
    const packageInfo = await SubscriptionPackage.findById(packageId);
    
    if (!packageInfo) {
      throw new Error('Không tìm thấy gói đăng ký');
    }
    
    if (!packageInfo.isActive) {
      throw new Error('Gói đăng ký hiện không khả dụng');
    }
    
    // Kiểm tra nếu người dùng đã có gói đăng ký
    if (user.subscription && user.subscription.package && user.subscription.status === 'active') {
      // Nếu đăng ký cùng gói, xem như gia hạn
      if (user.subscription.package._id.toString() === packageInfo._id.toString()) {
        // Gia hạn gói hiện tại
        return this._extendSubscription(user, packageInfo, paymentInfo);
      } else {
        // Nâng cấp/hạ cấp gói
        // Lưu lại gói cũ
        const oldPackage = user.subscription.package;
        
        // Nếu đang từ gói cao xuống gói thấp hơn (downgrade)
        if (oldPackage.price > packageInfo.price && packageInfo.name !== 'free') {
          // Có thể tính toán hoàn tiền chênh lệch ở đây nếu cần
        }
      }
    }
    
    // Nếu là gói Free, không cần xử lý thanh toán
    if (packageInfo.name === 'free') {
      // Cập nhật thông tin đăng ký cho người dùng
      user.subscription = {
        package: packageInfo._id,
        status: 'active',
        startDate: new Date(),
        endDate: null, // Gói Free không có ngày hết hạn
        autoRenew: false
      };
      
      await user.save();
      
      return {
        success: true,
        message: 'Đăng ký gói Free thành công',
        subscription: user.subscription
      };
    }
    
    // Xử lý thanh toán cho gói trả phí
    // Kiểm tra thông tin thanh toán
    if (!paymentInfo || !paymentInfo.transactionId) {
      throw new Error('Thông tin thanh toán không hợp lệ');
    }
    
    // Tính ngày hết hạn - chuyển đổi từ số tháng sang ngày
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + packageInfo.duration); // Cộng thêm số tháng
    
    // Thêm thông tin thanh toán vào lịch sử
    const paymentHistory = user.subscription?.paymentHistory || [];
    paymentHistory.push({
      amount: packageInfo.price,
      date: new Date(),
      transactionId: paymentInfo.transactionId
    });
    
    // Cập nhật thông tin đăng ký cho người dùng
    user.subscription = {
      package: packageInfo._id,
      status: 'active',
      startDate: startDate,
      endDate: endDate,
      autoRenew: true, // Mặc định bật tự động gia hạn cho gói trả phí
      paymentHistory: paymentHistory
    };
    
    await user.save();
    
    return {
      success: true,
      message: `Đăng ký gói ${packageInfo.name} thành công`,
      subscription: {
        package: packageInfo,
        status: 'active',
        startDate: startDate,
        endDate: endDate
      }
    };
  },
  
  /**
   * Hàm nội bộ để gia hạn gói đăng ký
   * @private
   */
  async _extendSubscription(user, packageInfo, paymentInfo) {
    // Tính toán ngày hết hạn mới
    let newEndDate;
    
    if (user.subscription.endDate && user.subscription.endDate > new Date()) {
      // Nếu gói hiện tại còn hạn, cộng thêm thời gian mới
      newEndDate = new Date(user.subscription.endDate);
      newEndDate.setMonth(newEndDate.getMonth() + packageInfo.duration);
    } else {
      // Nếu gói đã hết hạn, tính từ hiện tại
      newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + packageInfo.duration);
    }
    
    // Thêm thông tin thanh toán vào lịch sử
    const paymentHistory = user.subscription?.paymentHistory || [];
    paymentHistory.push({
      amount: packageInfo.price,
      date: new Date(),
      transactionId: paymentInfo.transactionId
    });
    
    // Cập nhật thông tin đăng ký
    user.subscription.endDate = newEndDate;
    user.subscription.status = 'active';
    user.subscription.paymentHistory = paymentHistory;
    
    await user.save();
    
    return {
      success: true,
      message: `Gia hạn gói ${packageInfo.name} thành công`,
      subscription: {
        package: packageInfo,
        status: 'active',
        startDate: user.subscription.startDate,
        endDate: newEndDate
      }
    };
  },
  
  /**
   * Hủy gói đăng ký của người dùng
   * @param {string} userId - ID của người dùng
   * @returns {Object} Kết quả hủy đăng ký
   */
  async cancelSubscription(userId) {
    // Kiểm tra ID người dùng hợp lệ
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('ID người dùng không hợp lệ');
    }
    
    // Lấy thông tin người dùng
    const user = await User.findById(userId).populate('subscription.package');
    
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }
    
    // Kiểm tra nếu người dùng không có gói đăng ký
    if (!user.subscription || !user.subscription.package) {
      throw new Error('Người dùng chưa đăng ký gói nào');
    }
    
    // Kiểm tra nếu gói đã bị hủy
    if (user.subscription.status === 'cancelled') {
      throw new Error('Gói đăng ký đã bị hủy trước đó');
    }
    
    // Lưu thông tin gói để trả về
    const packageInfo = user.subscription.package;
    
    // Cập nhật trạng thái đăng ký
    user.subscription.status = 'cancelled';
    user.subscription.cancelDate = new Date();
    
    await user.save();
    
    // Lấy gói Free
    const freePackage = await SubscriptionPackage.findOne({ name: 'free' });
    
    return {
      success: true,
      message: `Đã hủy gói đăng ký ${packageInfo.name}. Bạn sẽ sử dụng gói Free sau khi hết hạn gói hiện tại.`,
      previousPackage: packageInfo,
      newPackage: freePackage
    };
  },
  
  /**
   * Kiểm tra và cập nhật các gói đăng ký đã hết hạn
   * @returns {Object} Kết quả cập nhật
   */
  async checkAndUpdateExpiredSubscriptions() {
    try {
      const now = new Date();
      
      // Tìm tất cả người dùng có gói đăng ký còn hoạt động nhưng đã hết hạn
      const users = await User.find({
        'subscription.status': 'active',
        'subscription.endDate': { $lt: now },
        'subscription.autoRenew': { $ne: true }
      }).populate('subscription.package');
      
      let updatedCount = 0;
      
      for (const user of users) {
        // Lấy thông tin gói hiện tại
        const currentPackage = user.subscription.package;
        
        // Ghi lại thông tin gói để thống kê
        console.log(`Cập nhật gói hết hạn cho user ${user._id}, từ gói ${currentPackage.name}`);
        
        // Tìm gói Free
        const freePackage = await SubscriptionPackage.findOne({ name: 'free' });
        
        if (!freePackage) {
          console.error('Không tìm thấy gói Free để cập nhật');
          continue;
        }
        
        // Cập nhật sang gói Free
        user.subscription.package = freePackage._id;
        user.subscription.status = 'expired';
        user.subscription.endDate = null;
        
        await user.save();
        updatedCount++;
      }
      
      return {
        success: true,
        message: `Đã cập nhật ${updatedCount} gói đăng ký hết hạn`,
        updatedCount
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật gói hết hạn:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },
  
  /**
   * Xử lý tự động gia hạn gói đăng ký
   * @returns {Object} Kết quả gia hạn tự động
   */
  async processAutoRenewals() {
    try {
      const now = new Date();
      // Ngày mai
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Tìm tất cả người dùng có gói đăng ký sắp hết hạn và bật tự động gia hạn
      const users = await User.find({
        'subscription.status': 'active',
        'subscription.endDate': { $lt: tomorrow, $gte: now },
        'subscription.autoRenew': true
      }).populate('subscription.package');
      
      let renewedCount = 0;
      
      for (const user of users) {
        // Xử lý gia hạn tự động ở đây (tích hợp với cổng thanh toán)
        // Đây chỉ là mẫu, bạn cần tích hợp với hệ thống thanh toán thực tế
        
        console.log(`Đang xử lý gia hạn tự động cho user ${user._id}, gói ${user.subscription.package.name}`);
        
        // TODO: Tích hợp thanh toán thực tế
        // Tại đây, mình có thể gửi email thông báo cho user về việc gia hạn
        
        renewedCount++;
      }
      
      return {
        success: true,
        message: `Đã xử lý ${renewedCount} yêu cầu gia hạn tự động`,
        renewedCount
      };
    } catch (error) {
      console.error('Lỗi khi xử lý gia hạn tự động:', error);
      return {
        success: false,
        message: error.message
      };
    }
  },
  
  /**
   * Kiểm tra và gửi thông báo cho các gói đăng ký sắp hết hạn
   * @returns {Object} Kết quả gửi thông báo
   */
  async checkAndSendExpiryNotifications() {
    try {
      const now = new Date();
      
      // Danh sách các mốc thông báo (số ngày trước khi hết hạn)
      const notificationDays = [7, 3, 1];
      let notificationsSent = 0;
      
      for (const days of notificationDays) {
        // Tính toán ngày sẽ hết hạn
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        
        // Tính toán phạm vi ngày (để tránh gửi nhiều lần)
        const rangeStart = new Date(expiryDate);
        rangeStart.setHours(0, 0, 0, 0);
        
        const rangeEnd = new Date(expiryDate);
        rangeEnd.setHours(23, 59, 59, 999);
        
        // Tìm tất cả người dùng có gói đăng ký sắp hết hạn trong khoảng này
        const users = await User.find({
          'subscription.status': 'active',
          'subscription.endDate': { $gte: rangeStart, $lte: rangeEnd }
        }).populate('subscription.package');
        
        console.log(`Tìm thấy ${users.length} người dùng có gói đăng ký sẽ hết hạn trong ${days} ngày`);
        
        for (const user of users) {
          try {
            // Gửi email thông báo
            await AuthService.sendSubscriptionExpiryEmail(
              user.email,
              user.name,
              days
            );
            
            console.log(`Đã gửi thông báo hết hạn đến ${user.email} (gói hết hạn trong ${days} ngày)`);
            notificationsSent++;
          } catch (emailError) {
            console.error(`Lỗi gửi email thông báo hết hạn đến ${user.email}:`, emailError);
          }
        }
      }
      
      return {
        success: true,
        message: `Đã gửi ${notificationsSent} thông báo hết hạn gói đăng ký`,
        notificationsSent
      };
    } catch (error) {
      console.error('Lỗi khi gửi thông báo hết hạn:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
};

module.exports = subscriptionService; 