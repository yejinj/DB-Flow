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

      const noIndexQuery = await NoIndexModel.find({ field: 'test999' })
        .explain('executionStats');
      
      const withIndexQuery = await WithIndexModel.find({ field: 'test999' })
        .explain('executionStats');

      const results = {
        noIndex: noIndexQuery.executionStats.executionTimeMillis,
        withIndex: withIndexQuery.executionStats.executionTimeMillis,
        noIndexPlan: noIndexQuery.queryPlanner.winningPlan.stage,
        withIndexPlan: withIndexQuery.queryPlanner.winningPlan.stage
      };

      // 테스트 검증 후 로그 출력
      expect(results.withIndex).toBeLessThan(results.noIndex);
      
      console.log('인덱스 없음:', results.noIndex + 'ms');
      console.log('인덱스 있음:', results.withIndex + 'ms');
      console.log('실행 계획 (인덱스 없음):', results.noIndexPlan);
      console.log('실행 계획 (인덱스 있음):', results.withIndexPlan);

    } finally {
      await disconnectDB();
    }
  }, 120000);
