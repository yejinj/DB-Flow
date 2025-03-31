const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

test('TTL index is correctly created', async () => {
  try {
    await connectDB();
    
    const schema = new mongoose.Schema({
      createdAt: { type: Date, default: Date.now },
    });
    schema.index({ createdAt: 1 }, { expireAfterSeconds: 5 });
    
    const TTLModel = mongoose.model('TTLTest', schema);
    
    await TTLModel.createCollection();
    
    const indexes = await TTLModel.collection.indexes();
    const ttlIndex = indexes.find(idx => idx.expireAfterSeconds);
    
    expect(ttlIndex).toBeDefined();
    expect(ttlIndex.expireAfterSeconds).toBe(5);
  } finally {
    await disconnectDB();
  }
}, 15000);
