const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

test('TTL index is correctly created', async () => {
  try {
    await connectDB();
    
    // 5초 후 자동 삭제되는 문서 생성
    const schema = new mongoose.Schema({
      createdAt: { type: Date, default: Date.now },
    });
    schema.index({ createdAt: 1 }, { expireAfterSeconds: 5 });
    
    const TTLModel = mongoose.model('TTLTest', schema); // 임시 모델
    
    await TTLModel.createCollection(); // 임시 컬렉션
    
    const indexes = await TTLModel.collection.indexes();
    const ttlIndex = indexes.find(idx => idx.expireAfterSeconds); // 생성한 인덱스 조회
    
    expect(ttlIndex).toBeDefined();
    expect(ttlIndex.expireAfterSeconds).toBe(5);
  } finally {
    await disconnectDB();
  }
}, 15000);
