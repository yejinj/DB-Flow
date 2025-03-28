const { MongoClient } = require('mongodb');

const uri = 'mongodb://mongo1:27017,mongo2:27017,mongo3:27017';

test('Read from secondary using readPreference', async () => {
  const client = new MongoClient(uri, {
    readPreference: 'secondaryPreferred',
    replicaSet: 'rs0',
    serverSelectionTimeoutMS: 10000,
  });

  await client.connect();

  const db = client.db('test');
  const collection = db.collection('readPrefTest');

  await collection.insertOne({ name: 'replica-read-check' });

  const result = await collection.findOne({ name: 'replica-read-check' });

  await client.close();

  expect(result.name).toBe('replica-read-check');
}, 15000);
