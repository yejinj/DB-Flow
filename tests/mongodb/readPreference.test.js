const { MongoClient } = require('mongodb');
const config = require('./testConfig');

test('Read from secondary using readPreference', async () => {
  const client = new MongoClient(config.uri, {
    readPreference: 'secondaryPreferred',
    replicaSet: 'rs0',
    ...config.defaultOptions
  });

  try {
    await client.connect();

    const db = client.db('test');
    const collection = db.collection('readPrefTest');

    await collection.insertOne({ name: 'replica-read-check' });
    const result = await collection.findOne({ name: 'replica-read-check' });

    expect(result.name).toBe('replica-read-check');
  } finally {
    await client.close();
  }
}, 15000);
