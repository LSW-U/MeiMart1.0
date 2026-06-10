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

export async function updateRiderSettings(settings: Partial<RiderSettings>): Promise<RiderSettings> {
  riderSettings = { ...getSettings(), ...settings };
  saveSettings();
  return { ...riderSettings };
}
