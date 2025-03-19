const request = require('supertest');
const app = require('../../app/app');

test('GET /api/users', async () => {
  const res = await request(app).get('/api/users');
  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});