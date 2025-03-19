const mongoose = require('mongoose');
const uri = 'mongodb://127.0.0.1:27117,127.0.0.1:27017,127.0.0.1:27019/myDatabase?replicaSet=rs0';

test('MongoDB connection', async () => {
  await mongoose.connect(uri);
  expect(mongoose.connection.readyState).toBe(1);
  await mongoose.disconnect();
}, 5000);