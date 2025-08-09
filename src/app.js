const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');

// Configuration imports
const { errorHandler, apiLimiter } = require('./middleware');
const corsOptions = require('./config/cors');
const passport = require('./config/passport');

// Route imports
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
const systemAnalyticsRoutes = require('./routes/systemAnalyticsRoutes');
const practiceRoutes = require('./routes/practiceRoutes');

const app = express();

// Trust proxy (necessary when using Ngrok or other proxies)
app.set('trust proxy', 1);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Cookie parser
app.use(cookieParser());

// Development logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Security middleware
app.use(helmet());

// Rate limiting
app.use(apiLimiter);

// Prevent HTTP parameter pollution
app.use(hpp());

// CORS
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Session middleware for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'quizappsecret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Payment callback routes (defined early to avoid conflicts)
app.get('/payment/success', (req, res) => {
  res.redirect(`/?paymentStatus=success&${new URLSearchParams(req.query).toString()}`);
});

app.get('/payment/error', (req, res) => {
  res.redirect(`/?paymentStatus=error&${new URLSearchParams(req.query).toString()}`);
});

// VNPay callback routes
app.get('/api/payments/result', require('./controllers/paymentController').handlePaymentResult);
app.post('/api/payments/result', require('./controllers/paymentController').handlePaymentResult);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/learning-analytics', learningAnalyticsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/system-analytics', systemAnalyticsRoutes);
app.use('/api/practice', practiceRoutes);

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.originalUrl}`
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app; 