import { makeApiBaseUrl } from '../src/core';
describe('批5 C1 makeApiBaseUrl', () => {
  it('裸域名（无 /api/v1）fail-fast 抛错', () => {
    expect(() => makeApiBaseUrl('https://api.example.com')).toThrow(/must end with \/api\/v1/);
  });
  it('尾斜杠去重：https://x/api/v1/ → https://x/api/v1', () => {
    expect(makeApiBaseUrl('https://x.example/api/v1/')).toBe('https://x.example/api/v1');
  });
});
