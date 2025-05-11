const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect, admin } = require('../middleware/auth');

// Routes công khai - không cần xác thực
// Lấy tất cả gói đăng ký
router.get('/', subscriptionController.getAllPackages);

// Lấy gói đăng ký theo ID
router.get('/id/:id', subscriptionController.getPackageById);

// Lấy gói đăng ký theo tên
router.get('/name/:name', subscriptionController.getPackageByName);

// Routes cho người dùng đã đăng nhập
// Lấy thông tin gói đăng ký của người dùng hiện tại
router.get('/my-subscription', protect, subscriptionController.getMySubscription);

// Đăng ký gói mới
router.post('/subscribe/:packageId', protect, subscriptionController.subscribe);

// Hủy gói đăng ký
router.post('/cancel', protect, subscriptionController.cancelSubscription);

// Routes yêu cầu quyền admin
// Tạo gói đăng ký mới
router.post('/', protect, admin, subscriptionController.createPackage);

// Cập nhật gói đăng ký
router.put('/:id', protect, admin, subscriptionController.updatePackage);

// Vô hiệu hóa gói đăng ký
router.put('/:id/deactivate', protect, admin, subscriptionController.deactivatePackage);

// Kích hoạt lại gói đăng ký
router.put('/:id/activate', protect, admin, subscriptionController.activatePackage);

// Lấy người dùng theo gói đăng ký
router.get('/users/:name', protect, admin, subscriptionController.getUsersByPackage);

// Lấy thống kê gói đăng ký
router.get('/statistics', protect, admin, subscriptionController.getPackageStatistics);

module.exports = router; 