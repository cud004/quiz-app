/**
 * Quản lý các tác vụ định kỳ của hệ thống
 */
const subscriptionService = require('./services/subscriptionService');

/**
 * Chạy tác vụ kiểm tra và cập nhật gói hết hạn
 * Chạy mỗi ngày lúc 00:05
 */
async function checkExpiredSubscriptions() {
  try {
    console.log('Đang chạy tác vụ kiểm tra gói hết hạn...');
    const result = await subscriptionService.checkAndUpdateExpiredSubscriptions();
    console.log('Kết quả cập nhật gói hết hạn:', result);
  } catch (error) {
    console.error('Lỗi khi chạy tác vụ kiểm tra gói hết hạn:', error);
  }
  
  // Tính thời gian cho lần chạy tiếp theo (24 giờ sau)
  scheduleNextRun(checkExpiredSubscriptions, 24 * 60 * 60 * 1000);
}

/**
 * Chạy tác vụ gửi thông báo gói sắp hết hạn
 * Chạy mỗi ngày lúc 09:00
 */
async function sendExpiryNotifications() {
  try {
    console.log('Đang chạy tác vụ gửi thông báo gói sắp hết hạn...');
    const result = await subscriptionService.checkAndSendExpiryNotifications();
    console.log('Kết quả gửi thông báo:', result);
  } catch (error) {
    console.error('Lỗi khi chạy tác vụ gửi thông báo:', error);
  }
  
  // Tính thời gian cho lần chạy tiếp theo (24 giờ sau)
  scheduleNextRun(sendExpiryNotifications, 24 * 60 * 60 * 1000);
}

/**
 * Chạy tác vụ xử lý gia hạn tự động
 * Chạy mỗi ngày lúc 01:00
 */
async function processAutoRenewals() {
  try {
    console.log('Đang chạy tác vụ xử lý gia hạn tự động...');
    const result = await subscriptionService.processAutoRenewals();
    console.log('Kết quả xử lý gia hạn tự động:', result);
  } catch (error) {
    console.error('Lỗi khi chạy tác vụ xử lý gia hạn tự động:', error);
  }
  
  // Tính thời gian cho lần chạy tiếp theo (24 giờ sau)
  scheduleNextRun(processAutoRenewals, 24 * 60 * 60 * 1000);
}

/**
 * Lên lịch cho lần chạy tiếp theo của một tác vụ
 * @param {Function} task - Hàm tác vụ cần chạy
 * @param {number} interval - Khoảng thời gian giữa các lần chạy (ms)
 */
function scheduleNextRun(task, interval) {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Thiết lập thời gian chạy cho ngày mai
  let nextRun;
  
  if (task === checkExpiredSubscriptions) {
    // Chạy lúc 00:05 hàng ngày
    nextRun = new Date(tomorrow.setHours(0, 5, 0, 0));
  } else if (task === sendExpiryNotifications) {
    // Chạy lúc 09:00 hàng ngày
    nextRun = new Date(tomorrow.setHours(9, 0, 0, 0));
  } else if (task === processAutoRenewals) {
    // Chạy lúc 01:00 hàng ngày
    nextRun = new Date(tomorrow.setHours(1, 0, 0, 0));
  } else {
    // Mặc định sau 24 giờ
    nextRun = new Date(now.getTime() + interval);
  }
  
  const delay = nextRun.getTime() - now.getTime();
  
  console.log(`Lên lịch chạy tác vụ ${task.name} lúc ${nextRun.toLocaleString()}`);
  
  setTimeout(task, delay);
}

/**
 * Khởi chạy các tác vụ định kỳ
 */
function initCronJobs() {
  console.log('Khởi tạo các tác vụ định kỳ...');
  
  // Chạy ngay lập tức lần đầu trong môi trường phát triển
  if (process.env.NODE_ENV === 'development') {
    console.log('Đang chạy các tác vụ định kỳ lần đầu (chỉ trong môi trường development)...');
    // Lên lịch nhưng không chạy ngay
  }
  
  // Lên lịch cho các tác vụ
  scheduleNextRun(checkExpiredSubscriptions, 24 * 60 * 60 * 1000);
  scheduleNextRun(sendExpiryNotifications, 24 * 60 * 60 * 1000);
  scheduleNextRun(processAutoRenewals, 24 * 60 * 60 * 1000);
  
  console.log('Đã khởi tạo xong các tác vụ định kỳ');
}

module.exports = {
  initCronJobs
}; 