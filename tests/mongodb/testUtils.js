const mongoose = require('mongoose');
const config = require('./testConfig');

async function connectDB(options = {}) {
  return mongoose.connect(config.uri, {
    ...config.defaultOptions,
    ...options
  });
}

async function disconnectDB() {
  return mongoose.disconnect();
}

module.exports = {
  connectDB,
  disconnectDB
}; 