const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

test('Rollback on transaction failure', async () => {
  try {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    const Dummy = mongoose.model('Dummy', new mongoose.Schema({ name: String }));
   
    try {
      await Dummy.create([{ name: 'before error' }], { session });
      throw new Error('Forced failure during transaction');
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      const count = await Dummy.countDocuments({ name: 'before error' });
      expect(count).toBe(0);
    } finally {
      session.endSession();
    }
  } finally {
    await disconnectDB();
  }
}, 15000);
