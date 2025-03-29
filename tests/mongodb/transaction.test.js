const mongoose = require('mongoose');

const uri = 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/test?replicaSet=rs0';

test('Rollback on transaction failure', async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

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
    await mongoose.disconnect();
  }
}, 15000);
