const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

test('MongoDB connection', async () => {
  try {
    await connectDB();
    expect(mongoose.connection.readyState).toBe(1); // 연결되면 테스트 통과
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  } finally {
    await disconnectDB();
  }
}, 10000);