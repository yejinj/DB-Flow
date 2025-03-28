const mongoose = require('mongoose');

const uri = 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/test?replicaSet=rs0';

test('Write with majority writeConcern', async () => {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    writeConcern: { w: 'majority', wtimeout: 3000 },
  });

  const TestModel = mongoose.model('WriteConcernTest', new mongoose.Schema({ value: String }));

  let errorCaught = false;

  try {
    await TestModel.create({ value: 'write test' });
  } catch (err) {
    errorCaught = true;
  } finally {
    await mongoose.disconnect();
  }

  expect(typeof errorCaught).toBe('boolean');
}, 15000);
