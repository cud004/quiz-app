const mongoose = require('mongoose');
const logger = require('../lib/logger');

const connectDB = async () => {
  try {
    // Connection options for better performance and reliability
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is required');
    }

    // Log masked URI for security
    const maskedUri = mongoUri.replace(/(mongodb\+srv:\/\/[^:]+:)[^@]+(@.*)/, '$1****$2');
    logger.info('Attempting to connect to MongoDB', { uri: maskedUri });

    await mongoose.connect(mongoUri, options);
    logger.success('MongoDB Connected Successfully!');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('MongoDB connection failed', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    process.exit(1);
  }
};

module.exports = connectDB;