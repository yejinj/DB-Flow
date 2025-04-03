const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./testUtils');

test('Compare query performance with/without index', async () => {
  try {
    await connectDB();
    
    const noIndexSchema = new mongoose.Schema({ field: String });
    const withIndexSchema = new mongoose.Schema({ 
      field: { type: String, index: true } 
    });

    const NoIndexModel = mongoose.model('NoIndexTest', noIndexSchema);
    const WithIndexModel = mongoose.model('WithIndexTest', withIndexSchema);

    const testData = Array.from({ length: 50000 }, (_, i) => ({
      field: `test${i}`
    }));

    await NoIndexModel.create(testData);
    await WithIndexModel.create(testData);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const noIndexQuery = await NoIndexModel.find({ field: 'test99999' })
      .explain('executionStats');
    
    const withIndexQuery = await WithIndexModel.find({ field: 'test99999' })
      .explain('executionStats');

    console.log('인덱스 없음:', noIndexQuery.executionStats.executionTimeMillis + 'ms');
    console.log('인덱스 있음:', withIndexQuery.executionStats.executionTimeMillis + 'ms');
    console.log('실행 계획 (인덱스 없음):', noIndexQuery.queryPlanner.winningPlan.stage);
    console.log('실행 계획 (인덱스 있음):', withIndexQuery.queryPlanner.winningPlan.stage);

    expect(withIndexQuery.executionStats.executionTimeMillis)
      .toBeLessThan(noIndexQuery.executionStats.executionTimeMillis);

  } finally {
    await disconnectDB();
  }
}, 60000);
