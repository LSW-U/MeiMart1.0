/**
 * settings 设备跟随单测 —— 批C 审查 P3#3（此前 expo-localization.mock 的
 * __setDeviceLanguage 钩子已就位但零测试消费，三条路径均无单测）。
 *
 * 覆盖路径：
 *   ① 设备语言不在支持列表（fr）→ detectDeviceLanguage 回退 zh
 *   ② getLocales 抛错（无原生宿主）→ try/catch 兜底 zh
 *   ②b getLocales 返回空数组（无 locale 信息）→ 同样回退 zh
 *   ③ 手动选择覆盖设备跟随：update({ language }) 后 get 返回手动值；
 *      resetModules（模拟重启）后 localStorage 存量仍压过设备跟随
 *
 * 实现约束（Why）：
 * - defaultSettings 在 settings.ts 模块顶层固化 detectDeviceLanguage() 结果，
 *   必须 jest.resetModules() 后重新加载才能按注入的设备语言重建默认值；
 *   加载用 jest.requireActual（动态 import() 在 jest 29 CJS 沙箱报
 *   "A dynamic import callback was invoked without --experimental-vm-modules"，
 *   裸 require 又因 tsconfig 无 @types/node 不可用），依赖 expo-localization/
 *   api/user 走正常 registry 命中下方 jest.mock；
 * - rn project 无 expo-localization moduleNameMapper，靠 jest.mock 工厂
 *   （自包含闭包，与 src/test/expo-localization.mock.js 同语义）拦截 require，
 *   测试用 jest.requireMock 拿同一 factory 实例（requireActual 会绕过 mock）；
 * - node 环境无 localStorage（真机 AsyncStorage 缺口同源，见方案 v2 §5 后续
 *   批次），注入内存桩让「重启后记忆」持久化链路真实走通（web 存储层语义）；
 * - 桩掉 services/api + services/user：isMockMode 强制 true，get/update 走
 *   纯本地 mock 层，不触 axios（dutyStatus 才走 api.patch，本组用例不涉及）。
 */

type LocalizationMockModule = {
  getLocales: () => { languageCode?: string; languageTag?: string }[];
  __setDeviceLanguage: (code: string) => void;
};

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

jest.mock('../services/api', () => ({
  api: { patch: jest.fn() },
  isMockMode: true,
}));

jest.mock('../services/user', () => ({
  riderApi: { getProfile: jest.fn() },
}));

function loadLocalizationMock(): LocalizationMockModule {
  return jest.requireMock('expo-localization') as unknown as LocalizationMockModule;
}

function loadSettingsModule(): typeof import('../services/settings') {
  return jest.requireActual('../services/settings');
}

// node env 无 localStorage——内存 Map 桩（getItem/setItem/removeItem 最小面，
// settings.ts 的 typeof 守卫在桩存在时走真持久化分支）
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

describe('settings 设备跟随（批C 审查 P3#3）', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    installLocalStorageStub();
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('① 设备语言 fr（不在支持列表）→ 默认回退 zh', () => {
    const localization = loadLocalizationMock();
    localization.__setDeviceLanguage('fr');
    const settings = loadSettingsModule();
    expect(settings.riderSettingsApi.get()).resolves.toMatchObject({ language: 'zh' });
  });

  it('② getLocales 抛错（无原生宿主）→ try/catch 兜底 zh', () => {
    const localization = loadLocalizationMock();
    // Why: spyOn 必须先于 loadSettingsModule——defaultSettings 在模块顶层固化
    jest.spyOn(localization, 'getLocales').mockImplementation(() => {
      throw new Error('no native host');
    });
    const settings = loadSettingsModule();
    expect(settings.riderSettingsApi.get()).resolves.toMatchObject({ language: 'zh' });
  });

  it('②b getLocales 返回空数组（无 locale 信息）→ 回退 zh', () => {
    const localization = loadLocalizationMock();
    jest.spyOn(localization, 'getLocales').mockImplementation(() => []);
    const settings = loadSettingsModule();
    expect(settings.riderSettingsApi.get()).resolves.toMatchObject({ language: 'zh' });
  });

  it('③ 手动选择覆盖设备跟随（同一实例 + 重启后 localStorage 记忆）', async () => {
    // 设备为 id（批C 新启用语言，验证可被跟随）
    const localization = loadLocalizationMock();
    localization.__setDeviceLanguage('id');
    const settings = loadSettingsModule();
    await expect(settings.riderSettingsApi.get()).resolves.toMatchObject({ language: 'id' });

    // 手动切换 pt → 压过设备跟随
    await settings.riderSettingsApi.update({ language: 'pt' });
    await expect(settings.riderSettingsApi.get()).resolves.toMatchObject({ language: 'pt' });

    // 模拟重启：resetModules 重建模块，localStorage 存量仍压过设备跟随 id
    jest.resetModules();
    const reloaded = loadSettingsModule();
    await expect(reloaded.riderSettingsApi.get()).resolves.toMatchObject({ language: 'pt' });
  });
});
