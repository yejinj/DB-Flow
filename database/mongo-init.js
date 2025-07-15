const { MongoClient } = require('mongodb');

async function waitForMongo(uri, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new MongoClient(uri);
      await client.connect();
      await client.close();
      return true;
    } catch (error) {
      console.log(`Waiting for MongoDB (attempt ${i + 1}/${maxRetries}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
}

(async () => {
  let client;
  try {
    console.log('🔄 Waiting for MongoDB instances to be ready...');
    
    // 모든 MongoDB 인스턴스가 준비될 때까지 기다리기
    const mongo1Ready = await waitForMongo('mongodb://mongo1:27017');
    const mongo2Ready = await waitForMongo('mongodb://mongo2:27017');
    const mongo3Ready = await waitForMongo('mongodb://mongo3:27017');
    
    if (!mongo1Ready || !mongo2Ready || !mongo3Ready) {
      throw new Error('MongoDB instances not ready after timeout');
    }
    
    console.log('✅ All MongoDB instances are ready');
    
    client = new MongoClient('mongodb://mongo1:27017');
    await client.connect();
    
    console.log('🔧 Connected to MongoDB, initiating replica set...');
    
    // 이미 replica set이 구성되어 있는지 확인
    try {
      const status = await client.db().admin().command({ replSetGetStatus: 1 });
      console.log('✅ Replica set already exists:', status.set);
      return;
    } catch (e) {
      console.log('🔄 Replica set not found, creating new one...');
    }
    
    const result = await client.db().admin().command({
      replSetInitiate: {
        _id: 'rs0',
        members: [
          { _id: 0, host: 'mongo1:27017', priority: 2 },
          { _id: 1, host: 'mongo2:27017', priority: 1 },
          { _id: 2, host: 'mongo3:27017', priority: 1 }
        ]
      }
    });
    
    console.log('✅ MongoDB Replica Set initiated successfully:', result);
    
    // replica set이 완전히 구성될 때까지 기다리기
    console.log('⏳ Waiting for replica set to be fully configured...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const finalStatus = await client.db().admin().command({ replSetGetStatus: 1 });
    console.log('🎉 Final replica set status:', finalStatus.myState);
    
  } catch (e) {
    console.error('❌ Replica Set init failed:', e.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
})();