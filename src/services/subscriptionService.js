const mongoose = require('mongoose');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const User = require('../models/User');

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
    
    // Lấy thông tin người dùng
    const user = await User.findById(userId)
      .select('subscription')
      .populate('subscription.package');
    
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
        isActive: true
      };
    }
    
    return {
      package: user.subscription.package,
      status: user.subscription.status,
      startDate: user.subscription.startDate,
      endDate: user.subscription.endDate,
      isActive: user.subscription.status === 'active'
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
    const user = await User.findById(userId);
    
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
    
    // Nếu là gói Free, không cần xử lý thanh toán
    if (packageInfo.name === 'free') {
      // Cập nhật thông tin đăng ký cho người dùng
      user.subscription = {
        package: packageInfo._id,
        status: 'active',
        startDate: new Date(),
        endDate: null // Gói Free không có ngày hết hạn
      };
      
      await user.save();
      
      return {
        success: true,
        message: 'Đăng ký gói Free thành công',
        subscription: user.subscription
      };
    }
    
    // Xử lý thanh toán (giả định đã thanh toán thành công)
    // Trong thực tế, cần tích hợp với payment gateway
    const paymentSuccess = true; // Giả định thanh toán thành công
    
    if (!paymentSuccess) {
      throw new Error('Thanh toán không thành công. Vui lòng thử lại sau.');
    }
    
    // Tính ngày hết hạn
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + packageInfo.duration);
    
    // Cập nhật thông tin đăng ký cho người dùng
    user.subscription = {
      package: packageInfo._id,
      status: 'active',
      startDate: startDate,
      endDate: endDate,
      paymentInfo: paymentInfo
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
  }
};

module.exports = subscriptionService; 