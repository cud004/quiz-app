/**
 * Cấu hình CORS được tối ưu hóa cho phép frontend kết nối với API
 * - Quản lý whitelist hiệu quả hơn
 * - Xử lý logic rõ ràng cho các môi trường
 * - Cải thiện logging để debug
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Danh sách các domain được phép truy cập
    const whitelist = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'https://sandbox.vnpayment.vn',
      'https://ik.imagekit.io/c3dq7il1wp/',

    ].filter(Boolean); // Loại bỏ các giá trị null/undefined
    
    // Kiểm tra xem origin có chứa ngrok không
    const isNgrokOrigin = origin && origin.includes('ngrok');
    
    // Log thông tin để debug
    console.log('CORS Request from:', origin || 'No origin (server-to-server)');
    
    if (process.env.NODE_ENV === 'production') {
      // Trong môi trường production
      if (!origin || whitelist.includes(origin) || isNgrokOrigin) {
        console.log('✅ CORS: Allowing request from:', origin || 'No origin');
        callback(null, true);
      } else {
        console.log('❌ CORS: Blocking request from:', origin);
        callback(new Error(`Origin ${origin} không được phép bởi CORS`));
      }
    } else {
      // Trong môi trường development - cho phép tất cả
      console.log('🔧 CORS: Development mode - allowing all origins');
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'ngrok-skip-browser-warning'
  ],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  credentials: true,
  optionsSuccessStatus: 204, // Thường 204 được khuyến nghị hơn cho OPTIONS
  maxAge: 86400 // Tăng lên 24 giờ để giảm requests preflight
};

module.exports = corsOptions;