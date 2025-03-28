const mongoose = require('mongoose');

const uri = 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/test?replicaSet=rs0';

test('TTL index is correctly created', async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  
  const schema = new mongoose.Schema({
    createdAt: { type: Date, default: Date.now },
  });
  schema.index({ createdAt: 1 }, { expireAfterSeconds: 5 });
  
  const TTLModel = mongoose.model('TTLTest', schema);
  
  await TTLModel.createCollection();
  
  const indexes = await TTLModel.collection.indexes();
  const ttlIndex = indexes.find(idx => idx.expireAfterSeconds);
  
  await mongoose.disconnect();
  
  expect(ttlIndex).toBeDefined();
  expect(ttlIndex.expireAfterSeconds).toBe(5);
}, 15000);
