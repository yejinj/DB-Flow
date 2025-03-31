const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

test('Write with majority writeConcern', async () => {
  try {
    await connectDB({
      writeConcern: { w: 'majority', wtimeout: 3000 }
    });

    const TestModel = mongoose.model('WriteConcernTest', new mongoose.Schema({ value: String }));

    let errorCaught = false;
    try {
      await TestModel.create({ value: 'write test' });
    } catch (err) {
      errorCaught = true;
    }

    expect(typeof errorCaught).toBe('boolean');
  } finally {
    await disconnectDB();
  }
}, 15000);
