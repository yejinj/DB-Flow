const mongoose = require('mongoose');

const uri = 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/test?replicaSet=rs0';

test('Query uses COLLSCAN without index', async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const schema = new mongoose.Schema({ field: String });
  const NoIndexModel = mongoose.model('ExplainTest', schema);

  await NoIndexModel.create([{ field: 'a' }, { field: 'b' }]);

  const res = await mongoose.connection.db
    .collection('explaintests')
    .find({ field: 'b' })
    .explain('executionStats');

  await mongoose.disconnect();

  expect(res.queryPlanner.winningPlan.stage).toBe('COLLSCAN');
}, 15000);
