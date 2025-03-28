const { MongoClient } = require('mongodb');

async function initReplicaSet() {
  const client = new MongoClient('mongodb://mongo1:27017', {
    useUnifiedTopology: true
  });

  await client.connect();
  const admin = client.db().admin();

  try {
    await admin.command({
      replSetInitiate: {
        _id: 'rs0',
        members: [
          { _id: 0, host: 'mongo1:27017' },
          { _id: 1, host: 'mongo2:27017' },
          { _id: 2, host: 'mongo3:27017' }
        ]
      }
    });
    console.log('✅ Replica Set initiated');
  } catch (e) {
    console.error('⚠️ Replica Set already initialized or failed:', e.message);
  } finally {
    await client.close();
  }
}

initReplicaSet();