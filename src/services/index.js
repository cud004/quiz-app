// Authentication & User Services
const authService = require('./authService');
const userService = require('./userService');
const imageService = require('./imageService');

// Quiz & Learning Services
const examService = require('./examService');
const questionService = require('./questionService');
const quizAttemptService = require('./quizAttemptService');

// Content Management Services
const topicService = require('./topicService');
const tagService = require('./tagService');

// Payment Services
const paymentService = require('./paymentService');
const vnpayService = require('./vnpayService');
const momoService = require('./momoService');

// Analytics Services
const analyticsService = require('./analyticsService');
const learningAnalyticsService = require('./learningAnalyticsService');
const systemAnalyticsService = require('./systemAnalyticsService');

// Other Services
const subscriptionService = require('./subscriptionService');
const suggestionService = require('./suggestionService');
const geminiService = require('./geminiService');

module.exports = {
  // Auth & User
  authService,
  userService,
  imageService,
  
  // Quiz & Learning
  examService,
  questionService,
  quizAttemptService,
  
  // Content
  topicService,
  tagService,
  
  // Payment
  paymentService,
  vnpayService,
  momoService,
  
  // Analytics
  analyticsService,
  learningAnalyticsService,
  systemAnalyticsService,
  
  // Others
  subscriptionService,
  suggestionService,
  geminiService
}; 