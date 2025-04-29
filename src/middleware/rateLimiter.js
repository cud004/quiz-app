const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn 100 request mỗi IP
  message: {
    errorCode: 'TOO_MANY_REQUESTS',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Trả về thông tin Rate Limit trong headers
  legacyHeaders: false, // Disable các header cũ
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      errorCode: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again after 15 minutes'
    });
  }
});

module.exports = rateLimiter;