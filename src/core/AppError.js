class AppError extends Error {
    constructor(errorCode, message, statusCode = 400) {
      super(message);
      this.errorCode = errorCode; // Mã lỗi (ví dụ: INVALID_ID, USER_NOT_FOUND)
      this.statusCode = statusCode; // HTTP status code (ví dụ: 400, 404, 500)
      Error.captureStackTrace(this, this.constructor); // Lưu stack trace để debug
    }
  }
  
  module.exports = AppError;