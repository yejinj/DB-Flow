const request = require('supertest');
const app = require('../../server');

describe('API Health Check', () => {
  it('should return MongoDB connection status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
  });
});
