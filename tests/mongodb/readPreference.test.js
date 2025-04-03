const { MongoClient } = require('mongodb');
const config = require('./testConfig');

afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
});

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

    await collection.insertOne({ name: 'replica-read-check' }); // 테스트용 문서 삽입
    const result = await collection.findOne({ name: 'replica-read-check' });

    expect(result.name).toBe('replica-read-check');
  } finally {
    await client.close();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}, 120000); // 타임아웃 증가
