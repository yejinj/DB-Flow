const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

test('Rollback on transaction failure', async () => {
  try {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    // 테스트용 임시 모델
    const Dummy = mongoose.model('Dummy', new mongoose.Schema({ name: String }));
   
    try {
      await Dummy.create([{ name: 'before error' }], { session });
      throw new Error('Forced failure during transaction');
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      const count = await Dummy.countDocuments({ name: 'before error' });
      // 에러 발생 시 트랜잭션에서 생성한 데이터 없어야 함
      expect(count).toBe(0);
    } finally {
      session.endSession();
    }
  } finally {
    await disconnectDB();
  }
}, 15000);
