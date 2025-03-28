const mongoose = require('mongoose');

const uri = 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/test?replicaSet=rs0';

test('Replica set failover triggers new primary election (manual)', async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const isMasterBefore = await mongoose.connection.db.command({ isMaster: 1 });
  const originalPrimary = isMasterBefore.primary;
  
  console.log('Original primary:', originalPrimary);
  console.log('Stepping down primary...');
  
  try {
    await mongoose.connection.db.admin().command({ replSetStepDown: 60, force: true });
  } catch (error) {
    console.log('Primary stepped down, connection closed as expected');
  }
  
  await mongoose.disconnect();
  await new Promise(res => setTimeout(res, 5000));
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  
  const isMasterAfter = await mongoose.connection.db.command({ isMaster: 1 });
  const newPrimary = isMasterAfter.primary;
  
  console.log('New primary:', newPrimary);
  
  expect(newPrimary).not.toBe(originalPrimary);
  
  await mongoose.disconnect();
}, 40000);
