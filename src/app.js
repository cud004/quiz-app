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
const path = require('path');


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
const learningAnalyticsRoutes = require('./routes/learningAnalyticsRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const suggestionRoutes = require('./routes/suggestionRoutes');
// Các cổng thanh toán được quản lý qua API chính
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

// Payment handling routes - define directly to avoid conflicts
app.get('/payment/success', (req, res) => {
  // Chuyển hướng về frontend với tham số từ query string
  res.redirect(`/?paymentStatus=success&${new URLSearchParams(req.query).toString()}`);
});

app.get('/payment/error', (req, res) => {
  // Chuyển hướng về frontend với tham số từ query string
  res.redirect(`/?paymentStatus=error&${new URLSearchParams(req.query).toString()}`);
});

// Important callback route for VNPay - define directly to make sure it works
app.get('/api/payments/result', require('./controllers/paymentController').handlePaymentResult);
app.post('/api/payments/result', require('./controllers/paymentController').handlePaymentResult);

// Mount API routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/suggestions', suggestionRoutes);
// Mount payment routes in specific order to avoid conflicts
app.use('/api/payments/momo', momoRoutes);
app.use('/api/payments/vnpay', vnpayRoutes);
app.use('/api/payments', paymentRoutes);

// Thêm route mới
app.use('/api/learning-analytics', learningAnalyticsRoutes);



// Error handler
app.use(errorHandler);

// Handle 404 for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.originalUrl}`
  });
});

// Serve React app for all other routes

module.exports = app; 