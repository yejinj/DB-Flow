const request = require('supertest');
const app = require('../../app');
const { performance } = require('perf_hooks');

test('Performance: GET /api/users', async () => {
  const start = performance.now();
  const res = await request(app).get('/api/users');
  const end = performance.now();

  const duration = end - start;

  console.log(`⏱  Response Time: ${duration.toFixed(2)} ms`);

  expect(res.statusCode).toBe(200);
  expect(duration).toBeLessThan(500);
});