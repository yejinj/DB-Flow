const { MongoClient } = require('mongodb');

(async () => {
  try {
    const client = new MongoClient('mongodb://mongo1:27017', { useUnifiedTopology: true });
    await client.connect();
    
    await client.db().admin().command({
      replSetInitiate: {
        _id: 'rs0',
        members: [0, 1, 2].map(id => ({ 
          _id: id, 
          host: `mongo${id + 1}:27017` 
        }))
      }
    });
    
    console.log('MongoDB Replica Set initiated');
  } catch (e) {
    console.error('Replica Set init failed:', e.message);
  } finally {
    await client?.close();
  }
})();