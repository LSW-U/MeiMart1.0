export type AppLanguage = 'en' | 'tet' | 'pt' | 'id';

export type RiderSettings = {
  language: AppLanguage;
  notificationsEnabled: boolean;
};

const storageKey = 'mei-delivery-app:rider-settings';

const defaultSettings: RiderSettings = {
  language: 'en',
  notificationsEnabled: true,
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
      riderSettings = JSON.parse(stored) as RiderSettings;
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
