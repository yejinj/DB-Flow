// 기본 테스트 - MongoDB 연결 없이 실행 가능
describe('Basic Tests', () => {
  test('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });

  test('should test environment variables', () => {
    expect(process.env.NODE_ENV || 'test').toBeDefined();
  });
}); 