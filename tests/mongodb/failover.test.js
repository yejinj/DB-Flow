const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

afterAll(async () => {
  await disconnectDB();
  await new Promise(resolve => setTimeout(resolve, 1000));
});

test('Replica set failover triggers new primary election (manual)', async () => {
  try {
    await connectDB();

    const isMasterBefore = await mongoose.connection.db.command({ isMaster: 1 }); // 기존 프라이머리 확인
    const originalPrimary = isMasterBefore.primary;
    
    await Promise.all([
      console.log('Original primary:', originalPrimary),
      console.log('Stepping down primary')
    ]);
    
    try {
      await mongoose.connection.db.admin().command({ replSetStepDown: 60, force: true }); // 60초 동안 프라이머리 다운
    } catch (error) {
      console.log('Primary stepped down, connection closed as expected');
    }
    
    await disconnectDB();
    await new Promise(res => setTimeout(res, 5000));
    await connectDB(); // 연결 재시도
    
    const isMasterAfter = await mongoose.connection.db.command({ isMaster: 1 }); // 새로운 프라이머리 확인
    const newPrimary = isMasterAfter.primary;
    
    await Promise.all([
      console.log('New primary:', newPrimary)
    ]);
    
    expect(newPrimary).not.toBe(originalPrimary);
  } finally {
    await disconnectDB();
  }
}, 120000);
