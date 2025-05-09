const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*', // Cho phép frontend origin hoặc tất cả nếu không được cấu hình
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Cho phép gửi cookies qua CORS
    optionsSuccessStatus: 200,
    maxAge: 3600 // Thời gian cache preflight request (1 giờ)
  };
  
  module.exports = corsOptions;