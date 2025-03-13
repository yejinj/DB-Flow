const request = require('supertest');
const app = require('../../app');
const mongoose = require('mongoose');

jest.setTimeout(20000);

describe('Document API', () => {
  let docId;

  beforeAll(async () => {
    const isReady = () => mongoose.connection.readyState === 1;

    const waitUntilConnected = async () => {
      const timeout = 15000;
      const interval = 300;
      let elapsed = 0;

      while (!isReady() && elapsed < timeout) {
        await new Promise((res) => setTimeout(res, interval));
        elapsed += interval;
      }

      if (!isReady()) throw new Error('MongoDB not connected');
    };

    await waitUntilConnected();
  });

  it('should create a document', async () => {
    const res = await request(app).post('/api/test').send({ message: 'test' });
    expect(res.statusCode).toBe(200);
    expect(res.body.insertedId).toBeDefined();
    docId = res.body.insertedId;
  });

  it('should get all documents', async () => {
    const res = await request(app).get('/api/test');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
