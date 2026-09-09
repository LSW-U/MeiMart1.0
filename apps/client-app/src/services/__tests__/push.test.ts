/**
 * push service 测试（批B B1/B2）
 *
 * 覆盖：
 *   - routeFromPushData 深链分流（P23 onPress 同款规则：order/promotion/未知降级）
 *   - shouldInitPush 短路（mock 模式不触原生模块）
 *   - registerPushToken payload（token/platform/locale 契约 RegisterDeviceTokenRequest）
 *   - deletePushToken 注销（DELETE body 携带 token）
 *   - 失败静默（api 抛错不向上传播）
 *
 * Why: 批B 改动零测试违反规则 8/22；本文件只 mock '@/services/api' 与 '@/i18n'，
 *      不 require expo-notifications（jsdom 无原生模块，getNotificationsModule 自身 catch 兜底）。
 */
import {
  routeFromPushData,
  shouldInitPush,
  registerPushToken,
  deletePushToken,
  fetchExpoPushToken,
} from '../push';
import { api } from '../api';

// Why getter：push.ts 里 `if (isMockMode)` 是按值判断，jest.fn 恒 truthy 会短路全挂——
// 可变变量 + getter 翻转（getter 形式 jest.mock 翻 isMockMode 惯例）
let mockIsMockMode = false;
jest.mock('../api', () => ({
  api: { post: jest.fn(), delete: jest.fn() },
  get isMockMode() {
    return mockIsMockMode;
  },
}));

jest.mock('@/i18n', () => ({ getCurrentLocale: () => 'zh' }));

jest.mock('@/config/app-config', () => ({
  getExtra: () => ({ eas: { projectId: 'proj-1' } }),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android },
}));

const apiPost = api.post as jest.Mock;
const apiDelete = api.delete as jest.Mock;

describe('routeFromPushData（B2 深链分流，P23 onPress 同款）', () => {
  it('ORDER_UPDATE + orderId → /order/:id', () => {
    expect(routeFromPushData({ orderId: 'o123', type: 'ORDER_UPDATE' }, 'ORDER_UPDATE')).toEqual({
      path: '/order/o123',
    });
  });

  it('ORDER_UPDATE 无 orderId → 订单列表页（不报错）', () => {
    expect(routeFromPushData({ type: 'ORDER_UPDATE' }, 'ORDER_UPDATE')).toEqual({
      path: '/(main)/orders',
    });
  });

  it('PROMOTION + productId → /product/:id', () => {
    expect(routeFromPushData({ productId: 'p9', type: 'PROMOTION' }, 'PROMOTION')).toEqual({
      path: '/product/p9',
    });
  });

  it('PROMOTION 无 productId → /coupons', () => {
    expect(routeFromPushData({ type: 'PROMOTION' }, 'PROMOTION')).toEqual({ path: '/coupons' });
  });

  it('type 省略时按 data 字段推断（后端 data 原样透传）', () => {
    expect(routeFromPushData({ orderId: 'o7' })).toEqual({ path: '/order/o7' });
    expect(routeFromPushData({ productId: 'p2' })).toEqual({ path: '/product/p2' });
  });

  it('未知 type / 无 data → 降级 null（调用方进通知页）；空 orderId 明确 type → 订单列表降级', () => {
    expect(routeFromPushData({ foo: 1 }, 'SYSTEM')).toEqual({ path: null });
    expect(routeFromPushData(undefined)).toEqual({ path: null });
    expect(routeFromPushData(null)).toEqual({ path: null });
    expect(routeFromPushData({ orderId: '' }, 'ORDER_UPDATE')).toEqual({ path: '/(main)/orders' });
  });

  it('type 明确时优先 type 分流（data 无 orderId 也走 order 降级而非 promotion）', () => {
    expect(routeFromPushData({ productId: 'p1' }, 'ORDER_UPDATE')).toEqual({
      path: '/(main)/orders',
    });
  });
});

describe('shouldInitPush', () => {
  it('native + 非 mock = true', () => {
    expect(shouldInitPush()).toBe(true);
  });
});

describe('registerPushToken（B1）', () => {
  beforeEach(() => {
    apiPost.mockReset();
  });

  it('POST /client/device-tokens payload 含 token/platform/locale（契约 RegisterDeviceTokenRequest）', async () => {
    apiPost.mockResolvedValueOnce({ id: 't1' });
    const ok = await registerPushToken('ExponentPushToken[abc]');
    expect(ok).toBe(true);
    expect(apiPost).toHaveBeenCalledWith('/client/device-tokens', {
      token: 'ExponentPushToken[abc]',
      platform: 'ANDROID',
      locale: 'zh',
    });
  });

  it('失败静默：api 抛错返回 false 不抛出', async () => {
    apiPost.mockRejectedValueOnce(new Error('401'));
    await expect(registerPushToken('tk')).resolves.toBe(false);
  });

  it('mock 模式短路：不发请求直接成功（jest/jsdom 无原生模块）', async () => {
    mockIsMockMode = true;
    const ok = await registerPushToken('tk');
    expect(ok).toBe(true);
    expect(apiPost).not.toHaveBeenCalled();
    mockIsMockMode = false;
  });
});

describe('deletePushToken（B1 登出注销）', () => {
  beforeEach(() => {
    apiDelete.mockReset();
  });

  it('DELETE /client/device-tokens，body 携带 token', async () => {
    await deletePushToken('tk-1');
    expect(apiDelete).toHaveBeenCalledWith('/client/device-tokens', {
      data: { token: 'tk-1' },
    });
  });

  it('失败静默不抛出（登出主流程不受影响）', async () => {
    apiDelete.mockRejectedValueOnce(new Error('network'));
    await expect(deletePushToken('tk-1')).resolves.toBeUndefined();
  });
});

describe('fetchExpoPushToken', () => {
  it('mock 模式短路返回 null（不触原生模块）', async () => {
    mockIsMockMode = true;
    await expect(fetchExpoPushToken()).resolves.toBeNull();
    mockIsMockMode = false;
  });

  it('非 mock 下原生模块不可用（jsdom）→ null 静默降级', async () => {
    // jsdom 环境无 expo-notifications 原生模块：getNotificationsModule catch 兜底返 null
    await expect(fetchExpoPushToken()).resolves.toBeNull();
  });
});
