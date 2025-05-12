const mongoose = require('mongoose');
const app = require('./app');
// Tạm thời comment lại phần cron job để tích hợp sau
// const { initCronJobs } = require('./cron');

// Load env vars
require('dotenv').config();

// Check required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_EXPIRE'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Log MongoDB URI (ẩn password)
const mongoUri = process.env.MONGO_URI;
const maskedUri = mongoUri.replace(/(mongodb\+srv:\/\/[^:]+:)[^@]+(@.*)/, '$1****$2');
console.log('Attempting to connect to MongoDB:', maskedUri);

// console.log('MONGO_URI:', process.env.MONGO_URI);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully!');
    
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      
      // Tạm thời comment lại khởi tạo các tác vụ định kỳ
      // initCronJobs();
    });
  })
  .catch(err => {
    console.error('MongoDB connection error details:', {
      name: err.name,
      message: err.message,
      code: err.code
    });
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});