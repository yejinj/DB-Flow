const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

test('MongoDB connection', async () => {
  try {
    await connectDB();
    expect(mongoose.connection.readyState).toBe(1);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  } finally {
    await disconnectDB();
  }
}, 10000);