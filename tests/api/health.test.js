const request = require('supertest');
const app = require('../../app');

jest.setTimeout(20000);

describe('API Health Check', () => {
  beforeAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  it('should return MongoDB connection status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
  });
});
