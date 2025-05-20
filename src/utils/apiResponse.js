/**
 * Class xử lý response API thống nhất
 */
class ApiResponse {
  /**
   * Trả về response thành công
   * @param {Object} res - Express response object
   * @param {Object} data - Data cần trả về
   * @param {string} message - Message thành công
   * @returns {Object} Response object
   */
  static success(res, data, message = 'Success') {
    return res.status(200).json({
      success: true,
      data,
      message
    });
  }

  /**
   * Trả về response lỗi
   * @param {Object} res - Express response object
   * @param {Error|string} error - Error object hoặc error message
   * @param {number} status - HTTP status code
   * @returns {Object} Response object
   */
  static error(res, error, status = 400) {
    const errorResponse = {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error.message || error,
        details: error.details || {}
      }
    };

    // Nếu error là object có code
    if (error.code) {
      errorResponse.error.code = error.code;
    }

    return res.status(status).json(errorResponse);
  }

  /**
   * Trả về response lỗi gateway
   * @param {Object} res - Express response object
   * @param {string} gateway - Tên gateway (vnpay, momo)
   * @param {Error} error - Error object
   * @returns {Object} Response object
   */
  static gatewayError(res, gateway, error) {
    return this.error(res, {
      code: `${gateway.toUpperCase()}_ERROR`,
      message: error.message,
      details: error.details || {}
    });
  }

  /**
   * Trả về response lỗi validation
   * @param {Object} res - Express response object
   * @param {Object} error - Validation error object
   * @returns {Object} Response object
   */
  static validationError(res, error) {
    return this.error(res, {
      code: 'VALIDATION_ERROR',
      message: 'Dữ liệu không hợp lệ',
      details: error.details || error
    }, 422);
  }

  /**
   * Trả về response lỗi không tìm thấy
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @returns {Object} Response object
   */
  static notFound(res, message = 'Không tìm thấy') {
    return this.error(res, {
      code: 'NOT_FOUND',
      message
    }, 404);
  }

  /**
   * Trả về response lỗi không có quyền
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @returns {Object} Response object
   */
  static forbidden(res, message = 'Không có quyền truy cập') {
    return this.error(res, {
      code: 'FORBIDDEN',
      message
    }, 403);
  }
  static unauthorized(res, message = 'Không xác thực') {
    return this.error(res, {
      code: 'UNAUTHORIZED',
      message
    }, 401);
  }

  /**
   * Trả về response lỗi server
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @returns {Object} Response object
   */
  static serverError(res, error) {
    console.error('Server Error:', error);
    return this.error(res, {
      code: 'SERVER_ERROR',
      message: 'Lỗi server',
      details: process.env.NODE_ENV === 'development' ? error : {}
    }, 500);
  }

  /**
   * Trả về response phân trang
   * @param {Object} res - Express response object
   * @param {Array} data - Danh sách dữ liệu
   * @param {Object} pagination - Thông tin phân trang
   * @param {string} message - Thông báo
   * @returns {Object} Response object
   */
  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      data,
      pagination,
      message
    });
  }
}

module.exports = ApiResponse; 