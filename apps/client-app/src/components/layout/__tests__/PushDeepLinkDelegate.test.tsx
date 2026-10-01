/**
 * PushDeepLinkDelegate 测试（批B B2 深链）
 *
 * 覆盖 resolveRouteFromResponse（response → PushRoute，含 null response / 缺 data /
 * data.type 非字符串容错）。listener/冷启动 useEffect 逻辑依赖 expo-notifications
 * 原生模块（jsdom 不可用），由 shouldInitPush/getNotificationsModule 双守卫兜底，
 * 路由分流逻辑本身在 push.test.ts 的 routeFromPushData 已全覆盖。
 */
import { resolveRouteFromResponse, navigateFromResponse } from '../PushDeepLinkDelegate';
import { router } from 'expo-router';

describe('resolveRouteFromResponse（B2 响应 → 路由）', () => {
  it('null response → 降级 null', () => {
    expect(resolveRouteFromResponse(null)).toEqual({ path: null });
  });

  it('完整 response + ORDER_UPDATE → /order/:id', () => {
    expect(
      resolveRouteFromResponse({
        notification: { request: { content: { data: { type: 'ORDER_UPDATE', orderId: 'o9' } } } },
      }),
    ).toEqual({ path: '/order/o9' });
  });

  it('data 缺失（content undefined 安全链）→ 降级 null', () => {
    expect(
      resolveRouteFromResponse({
        notification: { request: { content: undefined as unknown as { data?: never } } },
      }),
    ).toEqual({ path: null });
  });

  it('data.type 非字符串（后端注入数字等）不崩，按 data 字段推断', () => {
    expect(
      resolveRouteFromResponse({
        notification: {
          request: { content: { data: { type: 123 as unknown as string, productId: 'p3' } } },
        },
      }),
    ).toEqual({ path: '/product/p3' });
  });

  it('未知 type → 降级 null（页面层进通知页不报错）', () => {
    expect(
      resolveRouteFromResponse({
        notification: { request: { content: { data: { type: 'WALLET' } } } },
      }),
    ).toEqual({ path: null });
  });
});

// ============================================================================
// 批3 A6：navigateFromResponse 经 safeRoutePush 白名单——非法动态段 id 降级不导航
// （expo-router 全 mock，只取证 push 收到的 href）
// ============================================================================
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/services/push', () => ({
  shouldInitPush: () => false,
  getNotificationsModule: () => null,
  routeFromPushData: jest.requireActual('@/services/push').routeFromPushData,
}));

const mockedPush = router.push as jest.Mock;

describe('navigateFromResponse 批3 A6 safeRoutePush 接线', () => {
  beforeEach(() => {
    mockedPush.mockClear();
  });

  it('合法 orderId → push /order/:id', () => {
    navigateFromResponse({
      notification: { request: { content: { data: { type: 'ORDER_UPDATE', orderId: 'o-1' } } } },
    });
    expect(mockedPush).toHaveBeenCalledWith('/order/o-1');
  });

  it('非法 orderId（路径穿越）→ 降级不导航（safeRoutePush 白名单拦截）', () => {
    navigateFromResponse({
      notification: {
        request: { content: { data: { type: 'ORDER_UPDATE', orderId: '../../admin' } } },
      },
    });
    expect(mockedPush).not.toHaveBeenCalled();
  });

  it('非法 productId（% 编码）→ 降级不导航', () => {
    navigateFromResponse({
      notification: { request: { content: { data: { type: 'PROMOTION', productId: 'a%2Fb' } } } },
    });
    expect(mockedPush).not.toHaveBeenCalled();
  });

  it('无 data（path null）→ 降级进通知页', () => {
    navigateFromResponse(null);
    expect(mockedPush).toHaveBeenCalledWith('/service/notifications');
  });

  it('静态降级目标（无 id 列表页）→ 直接 push 不过白名单', () => {
    navigateFromResponse({
      notification: { request: { content: { data: { type: 'ORDER_UPDATE' } } } },
    });
    expect(mockedPush).toHaveBeenCalledWith('/(main)/orders');
  });
});
