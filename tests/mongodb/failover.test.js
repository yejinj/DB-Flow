const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

test('Replica set failover triggers new primary election (manual)', async () => {
  try {
    await connectDB();

    const isMasterBefore = await mongoose.connection.db.command({ isMaster: 1 });
    const originalPrimary = isMasterBefore.primary;
    
    console.log('Original primary:', originalPrimary);
    console.log('Stepping down primary');
    
    try {
      await mongoose.connection.db.admin().command({ replSetStepDown: 60, force: true });
    } catch (error) {
      console.log('Primary stepped down, connection closed as expected');
    }
    
    await disconnectDB();
    await new Promise(res => setTimeout(res, 5000));
    await connectDB();
    
    const isMasterAfter = await mongoose.connection.db.command({ isMaster: 1 });
    const newPrimary = isMasterAfter.primary;
    
    console.log('New primary:', newPrimary);
    
    expect(newPrimary).not.toBe(originalPrimary);
  } finally {
    await disconnectDB();
  }
}, 40000);
