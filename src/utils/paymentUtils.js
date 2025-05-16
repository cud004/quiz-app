/**
 * Các tiện ích xử lý cho thanh toán
 */

/**
 * Tính toán số tiền thanh toán cho từng cổng thanh toán
 * @param {number} amount - Số tiền gốc (đơn vị: nghìn đồng VND)
 * @param {string} gateway - Cổng thanh toán
 * @returns {number} Số tiền đã được điều chỉnh
 */
function calculateGatewayAmount(amount, gateway) {
  switch (gateway) {
    case 'vnpay':
      // VNPay yêu cầu số tiền ở đơn vị đồng (không có phần thập phân)
      // Database lưu đúng số tiền thực tế (99000 = 99.000 VND), 
      // nhưng VNPay yêu cầu nhân thêm 100
      return Math.round(amount);
    case 'momo':
      // MoMo sử dụng đúng số tiền trong database
      return Math.round(amount);
    default:
      return amount;
  }
}

/**
 * Chuẩn hóa số tiền hiển thị
 * @param {number} amount - Số tiền cần định dạng
 * @returns {string} Số tiền đã được định dạng theo kiểu Việt Nam
 */
function formatCurrency(amount) {
  return amount.toLocaleString('vi-VN') + ' VNĐ';
}

module.exports = {
  calculateGatewayAmount,
  formatCurrency
}; 