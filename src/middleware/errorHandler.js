const isProduction = process.env.NODE_ENV === 'production';

module.exports = (err, req, res, next) => {
  // Log chi tiết lỗi
  console.error(`[${req.method}] ${req.url} - Error:`, {
    errorCode: err.errorCode,
    message: err.message,
    stack: err.stack,
    body: req.body,
    params: req.params,
    query: req.query
  });

  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'SERVER_ERROR';
  const message = err.message || 'Something went wrong';

  // Trong môi trường production, ẩn thông tin nhạy cảm
  res.status(statusCode).json({
    success: false,
    errorCode,
    message: isProduction ? 'An error occurred' : message,
    ...(isProduction ? {} : { stack: err.stack })
  });
};