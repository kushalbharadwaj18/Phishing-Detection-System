const mongoose = require('mongoose');

// Configuration object for different environments
const config = {
  development: {
    port: process.env.PORT || 5000,
    mongodb: process.env.MONGODB_URI || 'mongodb://localhost:27017/phishing-detection',
    jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
    jwtExpiry: '7d',
    nodeEnv: 'development',
    corsOrigin: 'http://localhost:3000',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      authWindowMs: 15 * 60 * 1000,
      authMaxRequests: 5,
    },
    logging: {
      level: 'debug',
      format: 'dev',
    },
    cache: {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
  production: {
    port: process.env.PORT || 5000,
    mongodb: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: '7d',
    nodeEnv: 'production',
    corsOrigin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 100,
      authWindowMs: 15 * 60 * 1000,
      authMaxRequests: 10,
    },
    logging: {
      level: 'info',
      format: 'combined',
    },
    cache: {
      ttl: 24 * 60 * 60 * 1000,
    },
  },
  test: {
    port: 5001,
    mongodb: 'mongodb://localhost:27017/phishing-detection-test',
    jwtSecret: 'test_jwt_secret_key',
    jwtExpiry: '7d',
    nodeEnv: 'test',
    corsOrigin: 'http://localhost:3000',
    rateLimit: {
      windowMs: 1000,
      maxRequests: 1000,
      authWindowMs: 1000,
      authMaxRequests: 1000,
    },
    logging: {
      level: 'error',
      format: 'combined',
    },
    cache: {
      ttl: 1 * 60 * 60 * 1000, // 1 hour for testing
    },
  },
};

// Get current environment
const env = process.env.NODE_ENV || 'development';
const currentConfig = config[env];

// Validate required variables
if (!currentConfig.mongodb && env === 'production') {
  throw new Error('MONGODB_URI environment variable is required in production');
}

if (!currentConfig.jwtSecret && env === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

module.exports = {
  ...currentConfig,
  env,
};
