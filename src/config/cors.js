/**
 * Cấu hình CORS cho phép frontend kết nối với API
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Danh sách các origin được phép
    const whitelist = [
      process.env.FRONTEND_URL || 'http://localhost:3000',  // React frontend
      'http://localhost:5173',  // Vite frontend
      'http://localhost:8080',  // Vue frontend
      undefined,  // Cho phép requests từ Postman và các công cụ test API
    ];
    
    if (process.env.NODE_ENV === 'production') {
      // Trong môi trường production, chỉ chấp nhận các origin cụ thể
      if (whitelist.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Trong môi trường development, cho phép tất cả
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 3600 // 1 giờ
};
  
module.exports = corsOptions;