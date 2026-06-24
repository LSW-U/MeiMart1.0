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

// ── riderSettingsApi（react query 化后唯一对外接口） ────────────────

export const riderSettingsApi = {
  async get(): Promise<RiderSettings> {
    if (isMockMode) return { ...getMockSettings() };
    const res = await api.get<RiderSettings>('/rider/settings');
    return res.data;
  },

  async update(patch: Partial<RiderSettings>): Promise<RiderSettings> {
    if (isMockMode) {
      mockSettings = { ...getMockSettings(), ...patch };
      saveMockSettings();
      return { ...mockSettings };
    }
    const res = await api.patch<RiderSettings>('/rider/settings', patch);
    return res.data;
  },
};
