/**
 * PushDeepLinkDelegate 测试（批B B2 深链）
 *
 * 覆盖 resolveRouteFromResponse（response → PushRoute，含 null response / 缺 data /
 * data.type 非字符串容错）。listener/冷启动 useEffect 逻辑依赖 expo-notifications
 * 原生模块（jsdom 不可用），由 shouldInitPush/getNotificationsModule 双守卫兜底，
 * 路由分流逻辑本身在 push.test.ts 的 routeFromPushData 已全覆盖。
 */
import { resolveRouteFromResponse } from '../PushDeepLinkDelegate';

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
