const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

test('Query uses COLLSCAN without index', async () => {
  try {
    await connectDB();
    
    const schema = new mongoose.Schema({ field: String });
    const NoIndexModel = mongoose.model('ExplainTest', schema);

    await NoIndexModel.create([{ field: 'a' }, { field: 'b' }]);

    const res = await mongoose.connection.db
      .collection('explaintests')
      .find({ field: 'b' })
      .explain('executionStats');

    expect(res.queryPlanner.winningPlan.stage).toBe('COLLSCAN');
  } finally {
    await disconnectDB();
  }
}, 15000);
