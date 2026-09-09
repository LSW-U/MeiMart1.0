import { getLocales } from 'expo-localization';

import { api, isMockMode } from './api';
import { storageAdapter } from './storage';
import { riderApi } from './user';

export type AppLanguage = 'zh' | 'en' | 'tet' | 'pt' | 'id';

// Why: 运行时校验设备语言用（AppLanguage 是类型层，拿不到值列表）——satisfies 保证与 AppLanguage 同步
const SUPPORTED_LANGUAGES = [
  'zh',
  'en',
  'tet',
  'pt',
  'id',
] as const satisfies readonly AppLanguage[];

// Why: 方案 v2 §2.5——日期按当前语言 locale 映射；Intl 不支持 Tetum → en-US 回退
const LANGUAGE_LOCALE_TAGS: Record<AppLanguage, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  tet: 'en-US',
  pt: 'pt',
  id: 'id',
};

export function localeTagFor(language: AppLanguage): string {
  return LANGUAGE_LOCALE_TAGS[language] ?? 'en-US';
}

/**
 * 首次设备跟随（方案 v2 Q1/Q8 批次 C）：取设备首选语言就近匹配，不支持回退 zh。
 * Why: 未手动选择过语言时（持久化无存量）defaultSettings.language 走本函数；
 *      一旦用户手动切换即持久化覆盖，不再跟随系统。getLocales 在无原生宿主环境
 *      （jest node / 部分 web dev）可能抛错或返回空，try/catch 兜底回退 zh。
 */
function detectDeviceLanguage(): AppLanguage {
  try {
    const deviceCode = getLocales()[0]?.languageCode;
    if (deviceCode && (SUPPORTED_LANGUAGES as readonly string[]).includes(deviceCode)) {
      return deviceCode as AppLanguage;
    }
  } catch {
    // fallthrough to zh
  }
  return 'zh';
}

export type LanguageOption = {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  upcoming?: boolean;
};

// Why: 批C（Q8 定稿）——tet/pt 真译完成 + id（Bahasa Indonesia）与 pt 同级，三语同批开放
const enabledLanguageOptions: LanguageOption[] = [
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { code: 'tet', label: 'Tetum', nativeLabel: 'Tetun' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
];

// Why: upcoming 机制保留（Q5：翻译达标一个开一个，将来新语言先进这里再转正）
const upcomingLanguageOptions: LanguageOption[] = [];

export const languageOptions: LanguageOption[] = [
  ...enabledLanguageOptions,
  ...upcomingLanguageOptions,
];

// Why: 后端 duty API 用 ONLINE/OFFLINE/BUSY，骑手端 UI 用 onDuty/offDuty/busy
export type DutyStatus = 'onDuty' | 'offDuty' | 'busy';
export type BackendDutyStatus = 'ONLINE' | 'OFFLINE' | 'BUSY';

export const dutyStatusOptions: DutyStatus[] = ['onDuty', 'offDuty', 'busy'];

// Why: 后端 duty API status 字段是 ONLINE/OFFLINE/BUSY（大写），骑手端 UI 是 onDuty/offDuty/busy
const dutyStatusMap: Record<DutyStatus, BackendDutyStatus> = {
  onDuty: 'ONLINE',
  offDuty: 'OFFLINE',
  busy: 'BUSY',
};

const dutyStatusReverseMap: Record<BackendDutyStatus, DutyStatus> = {
  ONLINE: 'onDuty',
  OFFLINE: 'offDuty',
  BUSY: 'busy',
};

export type RiderSettings = {
  language: AppLanguage;
  notificationsEnabled: boolean;
  dutyStatus: DutyStatus;
};

export function getLanguageOptions(options?: { includeUpcoming?: boolean }): LanguageOption[] {
  const source = options?.includeUpcoming ? languageOptions : enabledLanguageOptions;
  return source.map((option) => ({ ...option }));
}

// ── 语言运行时（后续批 N5H4）─────────────────────────────────────────

/**
 * 当前生效语言（i18n 运行时真实值，rider 无 react-i18next——useTranslation 的
 * language 即本模块持久化值，故此模块态即运行时事实源）。
 * Why 模块态而非每次手读持久化：native 无 localStorage 同步读（此前
 * notification.ts/push-token.ts 手读 localStorage 在真机恒回退 en，审查 P3-2）；
 * hydration 完成后内存态与持久化一致，同步读零开销且单点。
 */
let activeLanguage: AppLanguage | null = null;

/** 当前语言（模块态优先，未水合时回退默认值链）——服务层同步读入口 */
export function getCurrentLanguage(): AppLanguage {
  if (activeLanguage) return activeLanguage;
  return getMockSettings().language;
}

/**
 * 启动水合：从持久化读 language/notificationsEnabled 覆盖内存默认值。
 * 单例（Promise 缓存）——多调用方并发 get 只触发一次持久化读。
 * detectDeviceLanguage 仅在持久化无存量（设备首次）时经 defaultSettings 生效。
 */
let hydrationPromise: Promise<void> | null = null;

export function ensureSettingsHydrated(): Promise<void> {
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      const stored = await storageAdapter.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<RiderSettings>;
          const settings = { ...getMockSettings(), ...parsed };
          mockSettings = settings;
          if (parsed.language) activeLanguage = parsed.language;
        } catch {
          // 持久化数据损坏 → 保持默认值链，下次写覆盖
        }
      }
    })();
  }
  return hydrationPromise;
}

// ── Mock layer (storage adapter；web dev 落 localStorage，native 落 AsyncStorage) ──

const storageKey = 'mei-delivery-app:rider-settings';

let defaultSettings: RiderSettings = buildDefaultSettings();

/**
 * Why 工厂而非常量：defaultSettings.language 在模块顶层固化 detectDeviceLanguage()
 * 结果——__resetForTest 模拟重启时需按当前设备语言重建（测试 ⑥⑦ 先设设备语言再
 * 重置模块态的顺序依赖此重建）。
 */
function buildDefaultSettings(): RiderSettings {
  return {
    // Why: 默认值层设备跟随（任务书批C #3）——未选择过语言时按设备取；手动选择后持久化覆盖
    language: detectDeviceLanguage(),
    notificationsEnabled: true,
    dutyStatus: 'onDuty',
  };
}

let mockSettings: RiderSettings | null = null;

function getMockSettings(): RiderSettings {
  if (mockSettings) return mockSettings;
  mockSettings = { ...defaultSettings };
  return mockSettings;
}

function saveMockSettings(): void {
  // Why 同步内存态先行 + 异步落持久化：调用方（riderSettingsApi.get/update）
  // 依赖同步 mock 语义；持久化经适配层（native AsyncStorage / web localStorage）。
  if (!mockSettings) return;
  void storageAdapter.setItem(storageKey, JSON.stringify(mockSettings));
}

// ── riderSettingsApi ───────────────────────────────────────────────

export const riderSettingsApi = {
  // Why: 后端没有 /rider/settings 路由，language/notificationsEnabled 本地存储，
  // dutyStatus 从 /rider/profile 的 status 字段获取（OFFLINE/ONLINE/BUSY）
  async get(): Promise<RiderSettings> {
    // 启动链路（N5H4-c）：优先读持久化覆盖设备跟随，再返回
    await ensureSettingsHydrated();
    if (isMockMode) return { ...getMockSettings() };
    // P6-1：失败直接 throw，让 useRiderSettings 的 isError 捕获——不再回退 offDuty。
    // 原回退 offDuty 会让 _layout 的 online=false 静默掉线（停 GPS/心跳/派单），是丢派单收入的根源。
    // 现在由调用方按 isError 判「加载失败」态（online=null 保守不停派单，见 _layout MainContent）。
    const profile = await riderApi.getProfile();
    const dutyStatus = dutyStatusReverseMap[profile.status] ?? 'offDuty';
    return { ...getMockSettings(), dutyStatus };
  },

  // Why: dutyStatus 调用 /rider/duty，language/notificationsEnabled 本地存储
  async update(patch: Partial<RiderSettings>): Promise<RiderSettings> {
    await ensureSettingsHydrated();
    if (isMockMode) {
      mockSettings = { ...getMockSettings(), ...patch };
      if (patch.language) activeLanguage = patch.language;
      saveMockSettings();
      return { ...mockSettings };
    }

    // 本地设置（language/notificationsEnabled）更新
    if (patch.language || patch.notificationsEnabled) {
      mockSettings = { ...getMockSettings(), ...patch };
      if (patch.language) activeLanguage = patch.language;
      saveMockSettings();
    }

    // dutyStatus 调用后端 /rider/duty API
    if (patch.dutyStatus) {
      const backendStatus = dutyStatusMap[patch.dutyStatus];
      await api.patch('/rider/duty', { status: backendStatus });
    }

    return { ...getMockSettings(), ...patch };
  },
};

// ── 专用 duty API（供 tasks.tsx 直接调用） ──────────────────────────

/**
 * 测试专用：重置模块态（mockSettings/activeLanguage/hydrationPromise），
 * 等价 resetModules 后重加载——jest-expo preset 全局链在 resetModules 下炸
 * （react-native-css-interop 读 undefined，settings-language-storage.test 实证），
 * 测试用本钩子模拟「进程重启」。生产路径不调用。
 */
export function __resetForTest(): void {
  defaultSettings = buildDefaultSettings();
  mockSettings = null;
  activeLanguage = null;
  hydrationPromise = null;
}

export const dutyApi = {
  // Why: 切换值班状态，调用后端 /rider/duty
  async updateStatus(status: DutyStatus): Promise<void> {
    if (isMockMode) {
      mockSettings = { ...getMockSettings(), dutyStatus: status };
      saveMockSettings();
      return;
    }
    const backendStatus = dutyStatusMap[status];
    await api.patch('/rider/duty', { status: backendStatus });
  },
};
