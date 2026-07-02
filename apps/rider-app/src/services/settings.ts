import { api, isMockMode } from './api';

export type AppLanguage = 'zh' | 'en' | 'tet' | 'pt' | 'id';

export type LanguageOption = {
  code: AppLanguage;
  label: string;
  nativeLabel: string;
  upcoming?: boolean;
};

const enabledLanguageOptions: LanguageOption[] = [
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
];

const upcomingLanguageOptions: LanguageOption[] = [
  { code: 'pt', label: 'Portuguese', nativeLabel: 'Português', upcoming: true },
  { code: 'tet', label: 'Tetum', nativeLabel: 'Tetun', upcoming: true },
];

export const languageOptions: LanguageOption[] = [...enabledLanguageOptions, ...upcomingLanguageOptions];

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
  language: 'zh',
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
  // dutyStatus 从 /rider/duty 获取（但该端点只有 PATCH，没有 GET）
  // 真实 API 模式下，dutyStatus 需从 rider profile 的 status 字段推断
  async get(): Promise<RiderSettings> {
    if (isMockMode) return { ...getMockSettings() };
    // 真实 API 模式：language/notificationsEnabled 本地存储，dutyStatus 默认 offDuty
    // 后续可从 rider profile 获取 status 字段
    const localSettings = getMockSettings();
    return { ...localSettings, dutyStatus: 'offDuty' };
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