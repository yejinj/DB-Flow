const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

afterAll(async () => {
  await disconnectDB();
  await new Promise(resolve => setTimeout(resolve, 1000));
});

test('MongoDB connection', async () => {
  try {
    await connectDB();
    expect(mongoose.connection.readyState).toBe(1);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}, 10000);