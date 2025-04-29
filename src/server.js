const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const topicRoutes = require('./routes/topicRoutes');
const questionRoutes = require('./routes/questionRoutes');
const examRoutes = require('./routes/examRoutes');
const quizAttemptRoutes = require('./routes/quizAttemptRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const aiRoutes = require('./routes/aiRoutes');
const tagRoutes = require('./routes/tagRoutes');
const rateLimiter = require('./middleware/rateLimiter');
dotenv.config();

const app = express();

// Cấu hình CORS chi tiết
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // Cho phép frontend origin hoặc tất cả nếu không được cấu hình
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Cho phép gửi cookies qua CORS
  optionsSuccessStatus: 200,
  maxAge: 3600 // Thời gian cache preflight request (1 giờ)
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(rateLimiter);
connectDB().catch((err) => {
  console.error('Failed to connect to database:', err);
  process.exit(1); // Dừng server nếu không kết nối được DB
});

app.get('/', (req, res) => {
  res.json({ message: 'Quiz App API is running' });
});

// Đăng ký các router
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tags', tagRoutes);



app.use((req, res) => {
  res.status(404).json({ 
    errorCode: 'NOT_FOUND', 
    message: `Route ${req.method} ${req.url} not found` 
  });
});
// Error handler phải ở cuối cùng
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// Xử lý lỗi không mong muốn
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});