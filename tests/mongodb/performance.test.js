const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');
const PerformanceMonitor = require('../performance/monitor');

// 성능 테스트를 위한 스키마
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  age: Number,
  createdAt: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: Number,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Order = mongoose.model('Order', OrderSchema);

describe('MongoDB Performance Tests', () => {
  let monitor;

  beforeAll(async () => {
    await connectDB();
    monitor = new PerformanceMonitor();
  });

  afterAll(async () => {
    await disconnectDB();
    monitor.saveReport('mongodb-performance-report.json');
    monitor.printStats();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Order.deleteMany({});
  });

  test('Bulk Insert Performance', async () => {
    const startTime = Date.now();
    
    // 1000개 사용자 벌크 삽입
    const users = Array.from({ length: 1000 }, (_, i) => ({
      name: `User${i}`,
      email: `user${i}@example.com`,
      age: Math.floor(Math.random() * 50) + 18
    }));

    await monitor.monitorDBOperation('Bulk Insert 1000 Users', () => 
      User.insertMany(users)
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Bulk insert 1000 users: ${duration}ms`);
    expect(duration).toBeLessThan(5000); // 5초 이내
  });

  test('Index Performance Comparison', async () => {
    // 테스트 데이터 생성
    const users = Array.from({ length: 1000 }, (_, i) => ({
      name: `User${i}`,
      email: `user${i}@example.com`,
      age: Math.floor(Math.random() * 50) + 18
    }));
    await User.insertMany(users);

    // 인덱스 없이 쿼리
    const startTime1 = Date.now();
    const result1 = await monitor.monitorDBOperation('Query without index', () =>
      User.find({ age: { $gte: 25 } }).explain('executionStats')
    );
    const duration1 = Date.now() - startTime1;

    // 인덱스 생성
    await User.collection.createIndex({ age: 1 });

    // 인덱스 있이 쿼리
    const startTime2 = Date.now();
    const result2 = await monitor.monitorDBOperation('Query with index', () =>
      User.find({ age: { $gte: 25 } }).explain('executionStats')
    );
    const duration2 = Date.now() - startTime2;

    console.log(`Query without index: ${duration1}ms`);
    console.log(`Query with index: ${duration2}ms`);
    console.log(`Performance improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(2)}%`);

    expect(duration2).toBeLessThan(duration1);
  });

  test('Aggregation Pipeline Performance', async () => {
    // 테스트 데이터 생성
    const users = Array.from({ length: 1000 }, (_, i) => ({
      name: `User${i}`,
      email: `user${i}@example.com`,
      age: Math.floor(Math.random() * 50) + 18
    }));
    await User.insertMany(users);

    await monitor.monitorDBOperation('Aggregation Pipeline', () =>
      User.aggregate([
        { $match: { age: { $gte: 25 } } },
        { $group: { _id: null, avgAge: { $avg: '$age' }, count: { $sum: 1 } } }
      ])
    );
  });

  test('Concurrent Read Performance', async () => {
    // 테스트 데이터 생성
    const users = Array.from({ length: 1000 }, (_, i) => ({
      name: `User${i}`,
      email: `user${i}@example.com`,
      age: Math.floor(Math.random() * 50) + 18
    }));
    await User.insertMany(users);

    const startTime = Date.now();
    
    // 동시 읽기 테스트
    const promises = Array.from({ length: 100 }, (_, i) => 
      monitor.monitorDBOperation(`Concurrent Read ${i}`, () =>
        User.find({ age: { $gte: 25 } }).limit(10)
      )
    );
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    
    console.log(`Concurrent reads (100 queries): ${duration}ms`);
    expect(duration).toBeLessThan(3000); // 3초 이내
  });

  test('Write Performance Under Load', async () => {
    const startTime = Date.now();
    
    // 동시 쓰기 테스트
    const promises = Array.from({ length: 100 }, (_, i) => 
      monitor.monitorDBOperation(`Concurrent Write ${i}`, () =>
        User.create({
          name: `LoadUser${i}`,
          email: `loaduser${i}@example.com`,
          age: Math.floor(Math.random() * 50) + 18
        })
      )
    );
    
    await Promise.all(promises);
    
    const duration = Date.now() - startTime;
    
    console.log(`Concurrent writes (100 users): ${duration}ms`);
    expect(duration).toBeLessThan(5000); // 5초 이내
  });

  test('Complex Query Performance', async () => {
    // 복잡한 테스트 데이터 생성
    const users = Array.from({ length: 1000 }, (_, i) => ({
      name: `User${i}`,
      email: `user${i}@example.com`,
      age: Math.floor(Math.random() * 50) + 18,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // 30일 내
    }));
    await User.insertMany(users);

    await monitor.monitorDBOperation('Complex Query', () =>
      User.find({
        age: { $gte: 25, $lte: 45 },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7일 내
        name: { $regex: /^User[0-9]+$/ }
      }).sort({ age: 1 }).limit(50)
    );
  });

  test('Memory Usage Under Load', async () => {
    // 메모리 사용량 모니터링 시작
    const memoryInterval = setInterval(() => {
      monitor.monitorMemory();
    }, 1000);

    // 대량 데이터 생성 및 쿼리
    const users = Array.from({ length: 5000 }, (_, i) => ({
      name: `MemoryUser${i}`,
      email: `memoryuser${i}@example.com`,
      age: Math.floor(Math.random() * 50) + 18
    }));

    await monitor.monitorDBOperation('Bulk Insert 5000 Users', () =>
      User.insertMany(users)
    );

    // 복잡한 쿼리 반복 실행
    for (let i = 0; i < 10; i++) {
      await monitor.monitorDBOperation(`Complex Query ${i}`, () =>
        User.find({
          age: { $gte: 20, $lte: 50 },
          name: { $regex: /^MemoryUser/ }
        }).sort({ age: 1 }).limit(100)
      );
    }

    clearInterval(memoryInterval);
    
    const stats = monitor.generateStats();
    console.log(`최종 메모리 사용량: ${(stats.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  });
}); 