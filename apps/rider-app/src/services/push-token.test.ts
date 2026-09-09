/**
 * push-token / push-deep-link 单测（批C C3）
 *
 * 覆盖：
 *   - mock 模式跳过注册（无后端 token 行可写）
 *   - real 模式注册：POST /rider/device-tokens payload {token, platform, locale}；
 *     rid（FCM/APNs 原生 token）不进 Expo 通道 → 跳过注册
 *   - 权限申请链（批C 审查 P2-1）：已授权直通 / 未授权弹窗申请 / 拒绝与查询失败静默跳过
 *   - 失败容忍：getExpoPushTokenAsync 抛错（权限拒/无凭证）不炸调用方、不发请求
 *   - 登出注销：DELETE body {token}（原 token 内存态）；未注册过 → 不发请求
 *   - 平台守卫：web 跳过（jsdom Platform.OS 默认 'web'，经 __RN_PLATFORM_OS__ 切 android 验真机分支）
 *   - 深链路由 routeByPushData 语义：taskId→tasks / orderId→order/:id /
 *     WALLET(withdrawId/settlementId/category)→earnings / 无 data→notifications 兜底
 *
 * 桩法对齐 deposit.test.ts（jest 工厂读外层 mockState）+ expo-* 三 mock（jest.config.js
 * moduleNameMapper）。push-deep-link 的 router 走 expo-router mock（hoist 工厂）。
 */
import { api } from './api';
import { registerPushToken, unregisterPushToken } from './push-token';
// Why static import：jest CJS 环境无原生 dynamic import（--experimental-vm-modules 未开），
// 深链 hook 一并顶层导入；renderHook 从 @testing-library/react 顶层导入
import { usePushDeepLink, routeByPushData } from './push-deep-link';
import { renderHook } from '@testing-library/react';

const mockState = {
  mockMode: true,
  platformOs: 'android' as string,
  device: true,
  expoToken: { data: 'ExponentPushToken[abc123]' } as { data: string } | null,
  expoTokenError: null as Error | null,
  lastResponse: null as unknown,
};

jest.mock('./api', () => ({
  api: { post: jest.fn(), delete: jest.fn(), get: jest.fn(), patch: jest.fn() },
  get isMockMode() {
    return mockState.mockMode;
  },
}));

// Why 顶层 isDevice getter（非 Device.isDevice 嵌套）：push-token.ts 用
// `import * as Device from 'expo-device'`——namespace import 直接拿模块对象，
// isDevice 必须在模块顶层可读（嵌套 Device.isDevice 会得 undefined → 恒跳过）
jest.mock('expo-device', () => ({
  __esModule: true,
  get isDevice() {
    return mockState.device;
  },
  default: {
    get isDevice() {
      return mockState.device;
    },
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  Constants: { expoConfig: { extra: { eas: { projectId: 'test-project-id' } } } },
  default: { expoConfig: { extra: { eas: { projectId: 'test-project-id' } } } },
}));

const notificationsMock = jest.requireMock('expo-notifications') as {
  getExpoPushTokenAsync: jest.Mock;
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  setNotificationHandler: jest.Mock;
  addNotificationResponseReceivedListener: jest.Mock;
  getLastNotificationResponseAsync: jest.Mock;
  __setExpoToken: (r: { data: string } | null) => void;
  __setExpoTokenError: (e: Error | null) => void;
  __setLastResponse: (r: unknown) => void;
  __setPermission: (r: { granted: boolean }) => void;
  __setRequestPermissionsResult: (r: { granted: boolean }) => void;
  __getRequestPermissionsCalls: () => number;
  __getListeners: () => ((r: unknown) => void)[];
  __reset: () => void;
};

jest.mock('expo-notifications', () => {
  // 工厂内禁 TS 类型标注（babel-plugin-jest-hoist 把标注里的标识符当外层变量引用）。
  // Why as 断言而非类型标注：工厂体内只能引用 mock* 前缀变量，TS 标注会被 hoist 检查
  // 误判为外层引用；as 双重断言被 CLAUDE.md 禁，这里用 any 载体再赋值受型变量不可行——
  // 折衷：state 字段类型宽松（unknown/联合），getter 返回处收窄。
  const state = {
    expoToken: null as { data: string } | null,
    expoTokenError: null as Error | null,
    lastResponse: null as unknown,
    listeners: [] as unknown[],
  };
  const sync = () => {
    state.expoToken = mockState.expoToken;
    state.expoTokenError = mockState.expoTokenError;
    state.lastResponse = mockState.lastResponse;
  };
  return {
    __esModule: true,
    getExpoPushTokenAsync: jest.fn(async () => {
      sync();
      if (state.expoTokenError) throw state.expoTokenError;
      return state.expoToken;
    }),
    setNotificationHandler: jest.fn(),
    addNotificationResponseReceivedListener: jest.fn((listener: unknown) => {
      state.listeners.push(listener);
      return {
        remove: () => {
          const i = state.listeners.indexOf(listener);
          if (i >= 0) state.listeners.splice(i, 1);
        },
      };
    }),
    getLastNotificationResponseAsync: jest.fn(async () => {
      sync();
      return state.lastResponse;
    }),
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    __setExpoToken: (value: { data: string } | null) => {
      state.expoToken = value;
    },
    __setExpoTokenError: (value: Error | null) => {
      state.expoTokenError = value;
    },
    __setLastResponse: (value: unknown) => {
      state.lastResponse = value;
    },
    __getListeners: () => state.listeners,
    __reset: () => {
      state.listeners.length = 0;
    },
  };
});

// 深链：expo-router mock（push-deep-link 用 router.push）+ Platform（RN mock 壳走
// __RN_PLATFORM_OS__，但 push-token 直接 import Platform——jest web project 下
// react-native 已被 moduleNameMapper 换成 host 壳，其 Platform getter 读全局变量）
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  // push-deep-link 用具名 router（非 useRouter hook），两者都桩。
  // Why 闭包转发不直引 mockPush：工厂在 import 期执行，const mockPush 尚未初始化
  // （babel loose 模式 const→var 不报 TDZ，只会塞 undefined），调用期取值才安全。
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
}));

const mockPost = api.post as jest.Mock;
const mockDelete = api.delete as jest.Mock;

function setPlatform(os: string): void {
  mockState.platformOs = os;
  (
    globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' }
  ).__RN_PLATFORM_OS__ = os as 'web' | 'ios' | 'android';
}

beforeEach(() => {
  mockPost.mockClear();
  mockDelete.mockClear();
  mockPush.mockClear();
  notificationsMock.__reset();
  // 批C 审查 P2-1：权限桩默认已授权（既有用例不受影响），按用例覆盖；
  // token 调用计数一并清零（跨用例累积会让 not.toHaveBeenCalled 误报）
  notificationsMock.getExpoPushTokenAsync.mockClear();
  notificationsMock.getPermissionsAsync.mockClear().mockResolvedValue({ granted: true });
  notificationsMock.requestPermissionsAsync.mockClear().mockResolvedValue({ granted: true });
  mockState.mockMode = true;
  mockState.device = true;
  mockState.expoToken = { data: 'ExponentPushToken[abc123]' };
  mockState.expoTokenError = null;
  mockState.lastResponse = null;
  setPlatform('android');
});

afterEach(() => {
  delete (globalThis as typeof globalThis & { __RN_PLATFORM_OS__?: 'web' | 'ios' | 'android' })
    .__RN_PLATFORM_OS__;
});

describe('registerPushToken（批C C3 token 注册）', () => {
  it('mock 模式 → 跳过（不发请求、不取 token）', async () => {
    mockState.mockMode = true;
    await registerPushToken();
    expect(mockPost).not.toHaveBeenCalled();
    expect(notificationsMock.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('real + android 真机 → POST /rider/device-tokens payload 全集', async () => {
    mockState.mockMode = false;
    await registerPushToken();
    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toBe('/rider/device-tokens');
    expect(body).toEqual({
      token: 'ExponentPushToken[abc123]',
      platform: 'ANDROID',
      locale: 'en',
    });
  });

  // ── 批C 审查 P2-1：推送权限申请链（对齐 client push.ts ensurePermissions） ──

  it('已授权（getPermissionsAsync granted）→ 直通取 token，不触发 requestPermissionsAsync', async () => {
    mockState.mockMode = false;
    notificationsMock.getPermissionsAsync.mockResolvedValueOnce({ granted: true });
    await registerPushToken();
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(notificationsMock.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('未授权但申请成功（requestPermissionsAsync granted）→ 弹窗后照常注册', async () => {
    mockState.mockMode = false;
    notificationsMock.getPermissionsAsync.mockResolvedValueOnce({ granted: false });
    await registerPushToken();
    expect(notificationsMock.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('权限拒绝（requestPermissionsAsync denied）→ 静默跳过（不取 token、不发请求）', async () => {
    mockState.mockMode = false;
    notificationsMock.getPermissionsAsync.mockResolvedValueOnce({ granted: false });
    notificationsMock.requestPermissionsAsync.mockResolvedValueOnce({ granted: false });
    await expect(registerPushToken()).resolves.toBeUndefined();
    expect(notificationsMock.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('权限查询抛错（老设备/模拟器无通知服务）→ 按未授权静默跳过', async () => {
    mockState.mockMode = false;
    notificationsMock.getPermissionsAsync.mockRejectedValueOnce(new Error('ERR_UNAVAILABLE'));
    await expect(registerPushToken()).resolves.toBeUndefined();
    expect(notificationsMock.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rid 原生 token（FCM/APNs）→ 跳过注册（Expo 通道只认 ExponentPushToken）', async () => {
    mockState.mockMode = false;
    mockState.expoToken = { data: 'rid-8f7c-native-token' };
    await registerPushToken();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('getExpoPushTokenAsync 抛错（权限拒/无凭证）→ 容忍不炸、不发请求', async () => {
    mockState.mockMode = false;
    mockState.expoTokenError = new Error('ERR_UNAVAILABLE');
    await expect(registerPushToken()).resolves.toBeUndefined();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('模拟器（Device.isDevice=false）→ 跳过', async () => {
    mockState.mockMode = false;
    mockState.device = false;
    await registerPushToken();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('web 平台 → 跳过（无 APNs/FCM 通道）', async () => {
    mockState.mockMode = false;
    setPlatform('web');
    await registerPushToken();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('api.post 网络失败 → 容忍不炸（注册失败不阻塞登录）', async () => {
    mockState.mockMode = false;
    mockPost.mockRejectedValueOnce(new Error('network down'));
    await expect(registerPushToken()).resolves.toBeUndefined();
  });
});

describe('unregisterPushToken（登出注销）', () => {
  it('注册过 → DELETE body {token}', async () => {
    mockState.mockMode = false;
    await registerPushToken();
    await unregisterPushToken();
    expect(mockDelete).toHaveBeenCalledTimes(1);
    const [url, config] = mockDelete.mock.calls[0];
    expect(url).toBe('/rider/device-tokens');
    expect(config).toEqual({ data: { token: 'ExponentPushToken[abc123]' } });
  });

  it('未注册过（web/模拟器/mock 跳过路径）→ 不发请求', async () => {
    mockState.mockMode = false;
    setPlatform('web');
    await unregisterPushToken();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('重复注销 → 第二次不发请求（token 已清）', async () => {
    mockState.mockMode = false;
    await registerPushToken();
    await unregisterPushToken();
    await unregisterPushToken();
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});

describe('routeByPushData（批C C3 深链映射）', () => {
  it('data.taskId（新任务分配，RIDER_TASK 事件 data 是 taskId+orderId 双键）→ /(main)/tasks', () => {
    // 后端事件模板：task-assigned data = { taskId, orderId }——taskId 优先路由到任务列表
    routeByPushData({ taskId: 't-1', orderId: 'o-1' });
    expect(mockPush).toHaveBeenCalledWith('/(main)/tasks');
  });

  it('data.orderId（无 taskId）→ /order/:id', () => {
    routeByPushData({ orderId: 'o-99' });
    expect(mockPush).toHaveBeenCalledWith('/order/o-99');
  });

  it('WALLET withdrawId → /(main)/earnings（钱包深链勿丢）', () => {
    routeByPushData({ withdrawId: 'w-1', status: 'APPROVED' });
    expect(mockPush).toHaveBeenCalledWith('/(main)/earnings');
  });

  it('WALLET settlementId → /(main)/earnings', () => {
    routeByPushData({ settlementId: 's-1', amount: 2450 });
    expect(mockPush).toHaveBeenCalledWith('/(main)/earnings');
  });

  it('WALLET category 显式标注 → /(main)/earnings（优先于 orderId 判断的防御路径）', () => {
    routeByPushData({ category: 'WALLET' });
    expect(mockPush).toHaveBeenCalledWith('/(main)/earnings');
  });

  it('无 data → /notifications 兜底不报错', () => {
    routeByPushData(undefined);
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('未匹配 data（system 类型）→ /notifications 兜底', () => {
    routeByPushData({ category: 'SYSTEM' });
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });
});

describe('usePushDeepLink（冷启动 + listener 订阅）', () => {
  it('冷启动 lastResponse 有值 → 首渲染即按 data 深链', async () => {
    mockState.lastResponse = {
      notification: { request: { content: { data: { orderId: 'o-cold' } } } },
    };
    renderHook(() => usePushDeepLink());
    // getLastNotificationResponseAsync 是 Promise 链——flush 微任务后断言
    await Promise.resolve();
    await Promise.resolve();
    expect(mockPush).toHaveBeenCalledWith('/order/o-cold');
  });

  it('前台/后台点击 listener → 收到 response 即深链，卸载解注', () => {
    const { unmount } = renderHook(() => usePushDeepLink());
    const listeners = notificationsMock.__getListeners();
    expect(listeners.length).toBe(1);
    listeners[0]({ notification: { request: { content: { data: { withdrawId: 'w-9' } } } } });
    expect(mockPush).toHaveBeenCalledWith('/(main)/earnings');
    unmount();
    expect(notificationsMock.__getListeners().length).toBe(0);
  });
});
