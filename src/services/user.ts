import type { RiderProfile } from '@/src/types/rider';

const defaultProfile: RiderProfile = {
  id: '8842910',
  name: 'Alex Rider',
  phone: '+670 7700 0000',
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxYQTl8fmfVEjYlkPAfFPYKFQzFnJdbHZILY2zo70KbTeFOm1gHaq5a5hgcXMBx_K4rYX5RD_P-xVDOQabALqBnnaqUCZ9pnME_ZyaijrqU8pvVcs9vVQmB-SUOYytq4NmgjnkJU6vNlbukA_GxnB_tdqAJOKD1aFXMtJGyb-P8iNTWMu3zneBEhx07nTdDrUc05phtJYwAjgope5USCpA9iNRqKNFE_AsaZdVtw_0O9-DqC_93C04Ut2DIKF8tna1PxqbDB52e4Ct',
  vehicleType: 'Motorcycle Courier',
  licenseNumber: 'BI-1234567',
  status: 'online',
};

const storageKey = 'mei-delivery-app:rider-profile';

let riderProfile: RiderProfile | null = null;

const getProfile = () => {
  if (riderProfile) return riderProfile;

  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      riderProfile = JSON.parse(stored) as RiderProfile;
      return riderProfile;
    }
  }

  riderProfile = { ...defaultProfile };
  return riderProfile;
};

const saveProfile = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(getProfile()));
  }
};

export async function getRiderProfile(): Promise<RiderProfile> {
  return { ...getProfile() };
}

export async function updateRiderProfile(profile: Partial<RiderProfile>): Promise<RiderProfile> {
  riderProfile = { ...getProfile(), ...profile };
  saveProfile();
  return { ...riderProfile };
}

export async function resetRiderSession(): Promise<void> {
  riderProfile = { ...defaultProfile, status: 'offline' };
  saveProfile();
}
