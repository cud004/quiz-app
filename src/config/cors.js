/**
 * Cấu hình CORS cho phép frontend kết nối với API
 */
const corsOptions = {
  origin: function (origin, callback) {
    const whitelist = [
      process.env.FRONTEND_URL || 'http://localhost:3000',  
      'http://localhost:5173',
      'http://localhost:8080', 'https://sandbox.vnpayment.vn'
    ];

    if (process.env.NODE_ENV === 'production') {
      if (whitelist.includes(origin) || (origin && origin.includes('ngrok-free.app'))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      console.log(`CORS Request from origin: ${origin}`);
      callback(null, true);  // Development cho phép tất cả
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 3600
};

module.exports = corsOptions;
