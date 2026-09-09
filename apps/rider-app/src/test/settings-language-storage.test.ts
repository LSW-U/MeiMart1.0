/**
 * 存储适配层 + 语言运行时单测（后续批 N5H4）
 *
 * 来源：通知批C 审查 P3-2（N5）+ 语言优化 P2#1（H4）。
 *
 * 覆盖（任务书验收 N5H4-a/b/c）：
 *   A. 适配层双轨（N5H4-b）：
 *      ① web 轨（Platform.OS=web + localStorage 桩）→ get/set/remove 全走 localStorage
 *      ② native 轨（Platform.OS=ios）→ 全走 AsyncStorage（官方 jest mock 内存态）
 *      ③ native 存储抛错 → 容忍返 null / 不炸
 *   B. 语言运行时（N5H4-a）：
 *      ④ currentLanguage native（无 localStorage 环境）返回用户语言而非恒 en
 *        （notification.ts / push-token.ts 共用 getCurrentLanguage，服务层证据）
 *      ⑤ 切语言 → activeLanguage 即时生效（同步读，无需 await hydration）
 *   C. 持久化往返（N5H4-c）：
 *      ⑥ 切语言 → 重启（resetModules）→ 读取持久化值压过设备跟随
 *      ⑦ 设备首次（持久化无存量）→ detectDeviceLanguage 生效（设备 id 跟随）
 *      ⑧ 持久化损坏 JSON → 兜底默认值链不炸
 *
 * 实现约束（Why）：
 * - 本文件在 rn project（node 环境，web testMatch 不含 src/test/*.test.ts）。
 *   storage.ts 的 Platform 用 jest.mock 工厂可控（真实 jest-expo RN preset 的
 *   Platform.OS 恒 'ios'，web 轨必须桩）；语言运行时字段命名走 mock* 前缀
 *   （babel-plugin-jest-hoist 工厂只能引用 mock* 变量）。
 * - AsyncStorage 官方 jest mock（jest.config rn project moduleNameMapper 映射）。
 *   ⚠️ 实例同一性：必须 jest.requireActual（走同一 resolver 映射，与 storage.ts
 *   import 同一模块实例）；jest.requireMock 在无显式 jest.mock 注册时会 automock
 *   出第二份实例（函数无实现、map 全新），断言会看错对象（probe 实证）。
 * - expo-localization 用 jest.mock 工厂（node 无原生宿主，真包 getLocales 返回
 *   设备 locale 'en' 会污染默认值断言），__setDeviceLanguage 控制设备跟随。
 */

const mockPlatformOs = { current: 'ios' as 'web' | 'ios' };

jest.mock('expo-localization', () => {
  let deviceLanguageCode = 'zh';
  return {
    __esModule: true,
    getLocales: () => [{ languageCode: deviceLanguageCode, languageTag: deviceLanguageCode }],
    getCalendars: () => [{ timeZone: 'Asia/Dili', uses24hourClock: true, firstDay: 1 }],
    __setDeviceLanguage: (code: string) => {
      deviceLanguageCode = code;
    },
  };
});

function loadLocalizationMock(): { __setDeviceLanguage: (code: string) => void } {
  return jest.requireMock('expo-localization');
}

jest.mock('../services/api', () => ({
  api: { patch: jest.fn(), get: jest.fn(), post: jest.fn() },
  isMockMode: true,
}));

jest.mock('../services/user', () => ({
  riderApi: { getProfile: jest.fn() },
}));

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type AsyncStorageMock = {
  __INTERNAL_MOCK_STORAGE__: Record<string, string>;
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<null>;
  removeItem: (key: string) => Promise<null>;
};

function loadStorage(): { storageAdapter: StorageAdapter } {
  return jest.requireActual('../services/storage');
}

// Why requireActual：与 storage.ts 的 import 走同一 resolver（moduleNameMapper 命中
// 同一官方 mock 文件）→ 同一模块实例；requireMock 是 automock 第二实例（见文件头注）
function loadAsyncMock(): AsyncStorageMock {
  return jest.requireActual('@react-native-async-storage/async-storage') as AsyncStorageMock;
}

function installLocalStorageStub(): void {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key) : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

function localStorageStub(): { getItem: (key: string) => string | null } {
  return (globalThis as { localStorage?: { getItem: (key: string) => string | null } })
    .localStorage!;
}

const SETTINGS_KEY = 'mei-delivery-app:rider-settings';

// Why 不 jest.mock('react-native')：RN preset 的组件 mock（mockComponent.js）在
// requireActual 链上读 React 命名空间，任何 jest.mock('react-native') 工厂都会让该链
// 拿到 undefined → "Cannot read properties of undefined (reading 'Component')"
// （suite 级炸，probe6/probe7 实证）。web 轨改用 defineProperty 翻转真 Platform.OS
// （descriptor 是 configurable 的普通 value，probe4 实证），用后恢复。
type PlatformWithOs = { OS: string };

function setPlatformOs(os: 'web' | 'ios'): string {
  const { Platform } = jest.requireActual('react-native') as { Platform: PlatformWithOs };
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', {
    value: os,
    configurable: true,
    writable: true,
  });
  return original;
}

// Why helper：无法用 jest.resetModules 模拟重启（jest-expo 全局链炸，见 beforeEach
// 头注）。改在模块工厂内补「重启测试钩子」——由 settings.ts 导出 __resetForTest，
// 生产路径不调用（仅测试注入），等价 resetModules 后重加载。
type SettingsModule = {
  riderSettingsApi: {
    get: () => Promise<{ language: string; notificationsEnabled: boolean; dutyStatus: string }>;
    update: (patch: { language?: string }) => Promise<{ language: string }>;
  };
  ensureSettingsHydrated: () => Promise<void>;
  getCurrentLanguage: () => string;
  __resetForTest?: () => void;
};

function importSettingsFresh(): SettingsModule {
  const mod = jest.requireActual('../services/settings') as SettingsModule;
  mod.__resetForTest?.();
  return mod;
}

beforeEach(() => {
  // Why 不用 resetModules：jest-expo preset 全局链（ExpoFetchModule→ Appearance
  // getColorScheme）在 reset 后重载会炸（react-native-css-interop 读 undefined，
  // jest-expo setup 已实证）。本文件无模块级缓存状态需要重置——settings/storage
  // 的可变态靠 beforeEach 换 AsyncStorage mock 存量 + localStorage 桩隔离。
  jest.restoreAllMocks();
  mockPlatformOs.current = 'ios';
  loadAsyncMock().__INTERNAL_MOCK_STORAGE__ = {};
  importSettingsFresh();
});

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe('storageAdapter 双轨（N5H4-b）', () => {
  it('① web 轨：Platform.OS=web → set/get/remove 全走 localStorage', async () => {
    const original = setPlatformOs('web');
    installLocalStorageStub();
    const { storageAdapter } = loadStorage();

    await storageAdapter.setItem('k1', JSON.stringify({ language: 'pt' }));
    // AsyncStorage 不得被写入（走了 web 分支；requireActual 实例同一性成立才有此断言力）
    expect(loadAsyncMock().__INTERNAL_MOCK_STORAGE__).toEqual({});
    // localStorage 桩命中
    expect(localStorageStub().getItem('k1')).toBe(JSON.stringify({ language: 'pt' }));
    await expect(storageAdapter.getItem('k1')).resolves.toBe(JSON.stringify({ language: 'pt' }));

    await storageAdapter.removeItem('k1');
    await expect(storageAdapter.getItem('k1')).resolves.toBeNull();
    setPlatformOs(original as 'ios');
  });

  it('② native 轨：Platform.OS=ios → set/get/remove 全走 AsyncStorage', async () => {
    const { storageAdapter } = loadStorage();

    await storageAdapter.setItem('k2', 'v2');
    expect(loadAsyncMock().__INTERNAL_MOCK_STORAGE__['k2']).toBe('v2');
    await expect(storageAdapter.getItem('k2')).resolves.toBe('v2');

    await storageAdapter.removeItem('k2');
    await expect(storageAdapter.getItem('k2')).resolves.toBeNull();
  });

  it('③ native 存储抛错 → 容忍（getItem 返 null / set/remove 不炸）', async () => {
    const asMock = loadAsyncMock();
    jest.spyOn(asMock, 'getItem').mockRejectedValueOnce(new Error('disk error'));
    jest.spyOn(asMock, 'setItem').mockRejectedValueOnce(new Error('quota full'));
    jest.spyOn(asMock, 'removeItem').mockRejectedValueOnce(new Error('io error'));
    const { storageAdapter } = loadStorage();

    await expect(storageAdapter.getItem('k3')).resolves.toBeNull();
    await expect(storageAdapter.setItem('k3', 'v3')).resolves.toBeUndefined();
    await expect(storageAdapter.removeItem('k3')).resolves.toBeUndefined();
  });
});

describe('语言运行时 getCurrentLanguage（N5H4-a）', () => {
  it('④ native（无 localStorage 环境）hydration 后返回用户语言，不恒 en', async () => {
    loadAsyncMock().__INTERNAL_MOCK_STORAGE__[SETTINGS_KEY] = JSON.stringify({
      language: 'tet',
    });
    const settings = jest.requireActual('../services/settings');

    await settings.ensureSettingsHydrated();
    // P3-2 修复证据：原实现 localStorage 手读在 native 恒回退 en；现返回用户真值
    expect(settings.getCurrentLanguage()).toBe('tet');
  });

  it('⑤ 切语言 → activeLanguage 即时生效（同步读无需等下次 hydration）', async () => {
    const settings = jest.requireActual('../services/settings');
    await settings.ensureSettingsHydrated();
    expect(settings.getCurrentLanguage()).toBe('zh'); // 默认链（expo-localization mock 默认 zh）

    await settings.riderSettingsApi.update({ language: 'id' });
    expect(settings.getCurrentLanguage()).toBe('id');
    // 持久化同步落盘（AsyncStorage mock 内存态即时）
    expect(loadAsyncMock().__INTERNAL_MOCK_STORAGE__[SETTINGS_KEY]).toContain('"language":"id"');
  });
});

describe('语言持久化往返（N5H4-c）', () => {
  it('⑥ 切语言 → 重启（__resetForTest 等价冷启动）→ 读取持久化值压过设备跟随', async () => {
    // 设备语言 id（首次跟随）
    loadLocalizationMock().__setDeviceLanguage('id');

    const settings = importSettingsFresh();
    await settings.ensureSettingsHydrated();
    await expect(settings.riderSettingsApi.get()).resolves.toMatchObject({ language: 'id' });

    // 用户手动切换 pt → 持久化
    await settings.riderSettingsApi.update({ language: 'pt' });

    // 模拟重启：mock 存储等价磁盘。resetModules 会炸 jest-expo 全局链（见
    // importSettingsFresh 头注），改用 settings 模块的 __resetForTest 钩子清
    // mockSettings/activeLanguage/hydrationPromise 模块态，再重新水合等价冷启动。
    // ⚠️ 存量保留在 mock 存储里（等价磁盘不随进程消失）——只清内存态。
    const settings2 = importSettingsFresh();
    await settings2.ensureSettingsHydrated();
    await expect(settings2.riderSettingsApi.get()).resolves.toMatchObject({ language: 'pt' });
    // 语言运行时同步读（notification/push-token 服务层路径）也拿到 pt
    expect(settings2.getCurrentLanguage()).toBe('pt');
  });

  it('⑦ 设备首次（持久化无存量）→ detectDeviceLanguage 跟随设备，无持久化写入污染', async () => {
    loadLocalizationMock().__setDeviceLanguage('tet');

    const settings = importSettingsFresh();
    await settings.ensureSettingsHydrated();
    // 存量空 → 设备跟随 tet；未选择过 → 不落持久化（首次语义，保持跟随直至手动切换）
    await expect(settings.riderSettingsApi.get()).resolves.toMatchObject({ language: 'tet' });
    expect(loadAsyncMock().__INTERNAL_MOCK_STORAGE__[SETTINGS_KEY]).toBeUndefined();
  });

  it('⑧ 持久化损坏 JSON → 兜底默认值链不炸，getCurrentLanguage 可用', async () => {
    // 设备语言默认 zh（expo-localization mock 初始值）——损坏兜底断言依赖该默认值链
    loadLocalizationMock().__setDeviceLanguage('zh');
    loadAsyncMock().__INTERNAL_MOCK_STORAGE__[SETTINGS_KEY] = '{broken json';
    const settings = importSettingsFresh();

    await settings.ensureSettingsHydrated();
    expect(settings.getCurrentLanguage()).toBe('zh');
    await expect(settings.riderSettingsApi.get()).resolves.toMatchObject({
      language: 'zh',
      notificationsEnabled: true,
      dutyStatus: 'onDuty',
    });
  });
});
