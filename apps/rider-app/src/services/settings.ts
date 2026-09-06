import { getLocales } from 'expo-localization';

import { api, isMockMode } from './api';
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
 * Why: 未手动选择过语言时（localStorage 无存量）defaultSettings.language 走本函数；
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

// ── Mock layer (localStorage for Web dev) ──────────────────────────

const storageKey = 'mei-delivery-app:rider-settings';

const defaultSettings: RiderSettings = {
  // Why: 默认值层设备跟随（任务书批C #3）——未选择过语言时按设备取；手动选择后 localStorage 覆盖
  language: detectDeviceLanguage(),
  notificationsEnabled: true,
  dutyStatus: 'onDuty',
};

let mockSettings: RiderSettings | null = null;

function getMockSettings(): RiderSettings {
  if (mockSettings) return mockSettings;
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<RiderSettings>;
      mockSettings = { ...defaultSettings, ...parsed };
      return mockSettings;
    }
  }
  mockSettings = { ...defaultSettings };
  saveMockSettings();
  return mockSettings;
}

function saveMockSettings(): void {
  if (typeof localStorage !== 'undefined' && mockSettings) {
    localStorage.setItem(storageKey, JSON.stringify(mockSettings));
  }
}

// ── riderSettingsApi ───────────────────────────────────────────────

export const riderSettingsApi = {
  // Why: 后端没有 /rider/settings 路由，language/notificationsEnabled 本地存储，
  // dutyStatus 从 /rider/profile 的 status 字段获取（OFFLINE/ONLINE/BUSY）
  async get(): Promise<RiderSettings> {
    if (isMockMode) return { ...getMockSettings() };
    const localSettings = getMockSettings();
    // P6-1：失败直接 throw，让 useRiderSettings 的 isError 捕获——不再回退 offDuty。
    // 原回退 offDuty 会让 _layout 的 online=false 静默掉线（停 GPS/心跳/派单），是丢派单收入的根源。
    // 现在由调用方按 isError 判「加载失败」态（online=null 保守不停派单，见 _layout MainContent）。
    const profile = await riderApi.getProfile();
    const dutyStatus = dutyStatusReverseMap[profile.status] ?? 'offDuty';
    return { ...localSettings, dutyStatus };
  },

  // Why: dutyStatus 调用 /rider/duty，language/notificationsEnabled 本地存储
  async update(patch: Partial<RiderSettings>): Promise<RiderSettings> {
    if (isMockMode) {
      mockSettings = { ...getMockSettings(), ...patch };
      saveMockSettings();
      return { ...mockSettings };
    }

    // 本地设置（language/notificationsEnabled）更新
    if (patch.language || patch.notificationsEnabled) {
      mockSettings = { ...getMockSettings(), ...patch };
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
