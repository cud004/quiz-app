const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { errorHandler, apiLimiter } = require('./middleware');
const corsOptions = require('./config/cors');
const session = require('express-session');
const passport = require('./config/passport');

// Load env vars
require('dotenv').config();

// Route files
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const topicRoutes = require('./routes/topicRoutes');
const tagRoutes = require('./routes/tagRoutes');
const questionRoutes = require('./routes/questionRoutes');
const examRoutes = require('./routes/examRoutes');
const quizAttemptRoutes = require('./routes/quizAttemptRoutes');
const userPerformanceRoutes = require('./routes/userPerformanceRoutes');
const examRecommendationRoutes = require('./routes/examRecommendationRoutes');
const learningPathRoutes = require('./routes/learningPathRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
// Kích hoạt routes thanh toán
const momoRoutes = require('./routes/momoRoutes');
const vnpayRoutes = require('./routes/vnpayRoutes');

const app = express();

// Tin tưởng proxy (cần thiết khi sử dụng Ngrok hoặc các proxy khác)
app.set('trust proxy', 1);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set security headers
app.use(helmet());

// Global rate limiting
app.use(apiLimiter);

// Prevent http param pollution
app.use(hpp());

// Enable CORS
app.use(cors(corsOptions));

// Compress responses
app.use(compression());

// Session middleware cho OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'quizappsecret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);
app.use('/api/performance', userPerformanceRoutes);
app.use('/api/recommendations', examRecommendationRoutes);
app.use('/api/learning-paths', learningPathRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
// Kích hoạt routes thanh toán 
app.use('/api/payments/momo', momoRoutes);
app.use('/api/payments/vnpay', vnpayRoutes);

// Error handler
app.use(errorHandler);

// Handle 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

module.exports = app; 