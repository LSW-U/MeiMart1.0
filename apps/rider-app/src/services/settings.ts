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

export type DutyStatus = 'onDuty' | 'offDuty' | 'busy';

export const dutyStatusOptions: DutyStatus[] = ['onDuty', 'offDuty', 'busy'];

export type RiderSettings = {
  language: AppLanguage;
  notificationsEnabled: boolean;
  dutyStatus: DutyStatus;
};

// ── Mock layer (localStorage for Web dev) ──────────────────────────

const storageKey = 'mei-delivery-app:rider-settings';

const defaultSettings: RiderSettings = {
  language: 'zh',
  notificationsEnabled: true,
  dutyStatus: 'onDuty',
};

let mockSettings: RiderSettings | null = null;
const settingsListeners = new Set<(settings: RiderSettings) => void>();

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

function notifyMockListeners(): void {
  const snapshot = { ...getMockSettings() };
  settingsListeners.forEach((listener) => listener(snapshot));
}

// ── real API（axios，B.5.2 引入） ───────────────────────────────────
//
// 懒加载避免在 mock 模式（API_BASE_URL 为空）下加载 axios 报错。
// 完整 riderSettingsApi 在文件末尾统一 export。

// ── Public API（保留所有原 export 名，B.5.1 加 riderSettingsApi 在末尾） ──

export async function getRiderSettings(): Promise<RiderSettings> {
  if (isMockMode) {
    return { ...getMockSettings() };
  }
  const res = await api.get<RiderSettings>('/rider/settings');
  return res.data;
}

export function getLanguageOptions(options?: { includeUpcoming?: boolean }): LanguageOption[] {
  const source = options?.includeUpcoming ? languageOptions : enabledLanguageOptions;
  return source.map((option) => ({ ...option }));
}

export async function getCurrentLanguage(): Promise<AppLanguage> {
  if (isMockMode) return getMockSettings().language;
  const settings = await getRiderSettings();
  return settings.language;
}

export async function setCurrentLanguage(language: AppLanguage): Promise<RiderSettings> {
  return updateRiderSettings({ language });
}

export async function getCurrentDutyStatus(): Promise<DutyStatus> {
  if (isMockMode) return getMockSettings().dutyStatus;
  const settings = await getRiderSettings();
  return settings.dutyStatus;
}

export async function setDutyStatus(dutyStatus: DutyStatus): Promise<RiderSettings> {
  return updateRiderSettings({ dutyStatus });
}

export function subscribeRiderSettings(listener: (settings: RiderSettings) => void) {
  settingsListeners.add(listener);
  return () => {
    settingsListeners.delete(listener);
  };
}

export async function updateRiderSettings(settings: Partial<RiderSettings>): Promise<RiderSettings> {
  if (isMockMode) {
    mockSettings = { ...getMockSettings(), ...settings };
    saveMockSettings();
    notifyMockListeners();
    return { ...mockSettings };
  }
  const res = await api.patch<RiderSettings>('/rider/settings', settings);
  notifyMockListeners();
  return res.data;
}

// riderSettingsApi：聚合对象，新代码（notificationApi/earningsApi 等）用
export const riderSettingsApi = {
  get: getRiderSettings,
  update: updateRiderSettings,
};
