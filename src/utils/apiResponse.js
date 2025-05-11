/**
 * Lớp ApiResponse để chuẩn hóa format phản hồi
 * Đảm bảo tất cả các API đều trả về cùng một cấu trúc
 */
class ApiResponse {
  /**
   * Trả về thành công
   * @param {object} data - Dữ liệu trả về
   * @param {string} message - Thông báo thành công
   * @param {number} statusCode - HTTP status code
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Trả về thành công với phân trang
   * @param {object} data - Dữ liệu trả về
   * @param {object} pagination - Thông tin phân trang
   * @param {string} message - Thông báo thành công
   * @param {number} statusCode - HTTP status code
   */
  static paginated(res, data, pagination, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      pagination
    });
  }

  /**
   * Trả về lỗi
   * @param {string} message - Thông báo lỗi
   * @param {number} statusCode - HTTP status code
   * @param {array} errors - Chi tiết lỗi
   */
  static error(res, message = 'Error', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Trả về lỗi validation
   * @param {array} errors - Chi tiết lỗi validation
   * @param {string} message - Thông báo lỗi
   */
  static validationError(res, errors, message = 'Validation failed') {
    return this.error(res, message, 400, errors);
  }

  /**
   * Trả về lỗi không tìm thấy
   * @param {string} message - Thông báo lỗi
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  /**
   * Trả về lỗi không được phép
   * @param {string} message - Thông báo lỗi
   */
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  /**
   * Trả về lỗi không được xác thực
   * @param {string} message - Thông báo lỗi
   */
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }
}

module.exports = ApiResponse; 