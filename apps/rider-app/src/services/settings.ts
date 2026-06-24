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

const storageKey = 'mei-delivery-app:rider-settings';

const defaultSettings: RiderSettings = {
  language: 'zh',
  notificationsEnabled: true,
  dutyStatus: 'onDuty',
};

let riderSettings: RiderSettings | null = null;
const settingsListeners = new Set<(settings: RiderSettings) => void>();

const notifySettingsListeners = () => {
  const settings = { ...getSettings() };
  settingsListeners.forEach((listener) => listener(settings));
};

const getSettings = () => {
  if (riderSettings) return riderSettings;

  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<RiderSettings>;
      riderSettings = { ...defaultSettings, ...parsed };
      return riderSettings;
    }
  }

  riderSettings = { ...defaultSettings };
  return riderSettings;
};

const saveSettings = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(getSettings()));
  }
};

export async function getRiderSettings(): Promise<RiderSettings> {
  return { ...getSettings() };
}

export function getLanguageOptions(options?: { includeUpcoming?: boolean }): LanguageOption[] {
  const source = options?.includeUpcoming ? languageOptions : enabledLanguageOptions;
  return source.map((option) => ({ ...option }));
}

export async function getCurrentLanguage(): Promise<AppLanguage> {
  return getSettings().language;
}

export async function setCurrentLanguage(language: AppLanguage): Promise<RiderSettings> {
  return updateRiderSettings({ language });
}

export async function getCurrentDutyStatus(): Promise<DutyStatus> {
  return getSettings().dutyStatus;
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
  riderSettings = { ...getSettings(), ...settings };
  saveSettings();
  notifySettingsListeners();
  return { ...riderSettings };
}

// riderSettingsApi：B.5.1 内最小补丁让 notificationApi 能调，完整迁移在 B.5.2
export const riderSettingsApi = {
  get: getRiderSettings,
  update: updateRiderSettings,
};
