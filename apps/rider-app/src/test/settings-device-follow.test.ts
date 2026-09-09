/**
 * settings 设备跟随单测 —— 批C 审查 P3#3（此前 expo-localization.mock 的
 * __setDeviceLanguage 钩子已就位但零测试消费，三条路径均无单测）。
 *
 * 覆盖路径：
 *   ① 设备语言不在支持列表（fr）→ detectDeviceLanguage 回退 zh
 *   ② getLocales 抛错（无原生宿主）→ try/catch 兜底 zh
 *   ②b getLocales 返回空数组（无 locale 信息）→ 同样回退 zh
 *   ③ 手动选择覆盖设备跟随：update({ language }) 后 get 返回手动值；
 *      resetModules（模拟重启）后持久化存量（AsyncStorage mock）仍压过设备跟随
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
 * - node 环境持久化经 storage.ts 适配层走 AsyncStorage（N5H4 存储适配层，真机同源）；
 *   jest.config rn project 映射官方 jest mock（内存态），测试按用例清空/种存量；
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

// N5H4：持久化已切存储适配层（native AsyncStorage / web localStorage），node 环境
// Platform.OS=ios → 走 AsyncStorage（jest.config 映射官方 mock），localStorage 桩不再
// 参与持久化链路。保留 install 无害（仅 globalThis 挂载），但持久化断言全部走 adapter。

describe('settings 设备跟随（批C 审查 P3#3）', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    // N5H4：持久化走 AsyncStorage 官方 mock（模块作用域），每用例清空等价新装设备
    (
      jest.requireMock('@react-native-async-storage/async-storage') as {
        __INTERNAL_MOCK_STORAGE__: Record<string, string>;
      }
    ).__INTERNAL_MOCK_STORAGE__ = {};
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

    // 模拟重启：持久化现走 AsyncStorage 官方 mock（N5H4 存储适配层），其存储是
    // 模块实例作用域——resetModules 重建 registry 后 mock 是全新空实例；真机磁盘
    // 跨进程存活，故「reset 前经旧模块 adapter 读出存量 → reset 后经新模块 adapter
    // 种回」等价模拟磁盘存活（旧实现走全局 localStorage 天然存活，无需此步）。
    const persisted = await jest
      .requireActual('../services/storage')
      .storageAdapter.getItem('mei-delivery-app:rider-settings');
    jest.resetModules();
    await jest
      .requireActual('../services/storage')
      .storageAdapter.setItem('mei-delivery-app:rider-settings', persisted ?? '');
    const reloaded = loadSettingsModule();
    await expect(reloaded.riderSettingsApi.get()).resolves.toMatchObject({ language: 'pt' });
  });
});
