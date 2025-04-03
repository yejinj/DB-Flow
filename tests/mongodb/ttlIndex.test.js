const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

afterAll(async () => {
  await disconnectDB();
  await new Promise(resolve => setTimeout(resolve, 1000));
});

test('TTL index is correctly created', async () => {
  try {
    await connectDB();
    
    const schema = new mongoose.Schema({
      createdAt: { type: Date, default: Date.now },
    });

    // TTL 인덱스 생성 전에 기존 컬렉션 삭제
    await mongoose.connection.dropCollection('ttltests').catch(() => {});
    
    // TTL 인덱스 정의
    schema.index({ createdAt: 1 }, { expireAfterSeconds: 5 });
    
    const TTLModel = mongoose.model('TTLTest', schema);
    
    // 컬렉션 생성 및 인덱스 빌드를 명시적으로 수행
    await TTLModel.createCollection();
    await TTLModel.syncIndexes();
    
    // 인덱스가 생성될 때까지 잠시 대기
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 인덱스 확인
    const indexes = await TTLModel.collection.indexes();
    const ttlIndex = indexes.find(idx => idx.expireAfterSeconds);
    
    // 더 자세한 에러 메시지를 위한 디버깅 정보
    if (!ttlIndex) {
      console.log('Available indexes:', indexes);
      throw new Error('TTL index not found');
    }

    expect(ttlIndex).toBeDefined();
    expect(ttlIndex.expireAfterSeconds).toBe(5);
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  } finally {
    // 테스트 후 정리
    await mongoose.connection.dropCollection('ttltests').catch(() => {});
    await disconnectDB();
  }
}, 120000);
