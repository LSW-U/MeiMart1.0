import type { RiderProfile } from '@/src/types/rider';

import { API_BASE_URL, request, setAuthToken } from './api';

// ── Mock layer (localStorage) ──────────────────────────────────────

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
const sessionStorageKey = 'mei-delivery-app:rider-session';

let riderProfile: RiderProfile | null = null;
let riderSession: boolean | null = null;

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

const getSession = () => {
  if (riderSession !== null) return riderSession;

  if (typeof localStorage !== 'undefined') {
    riderSession = localStorage.getItem(sessionStorageKey) === 'active';
    return riderSession;
  }

  riderSession = true;
  return riderSession;
};

const saveSession = (active: boolean) => {
  riderSession = active;

  if (typeof localStorage !== 'undefined') {
    if (active) {
      localStorage.setItem(sessionStorageKey, 'active');
    } else {
      localStorage.removeItem(sessionStorageKey);
    }
  }
};

// ── Public API ─────────────────────────────────────────────────────

const isRemote = () => API_BASE_URL.length > 0;

export async function getRiderProfile(): Promise<RiderProfile> {
  if (isRemote()) {
    const remote = await request<RiderProfile>('/rider/profile');
    riderProfile = remote;
    saveProfile();
    return remote;
  }
  return { ...getProfile() };
}

export async function isRiderSessionActive(): Promise<boolean> {
  if (isRemote()) {
    try {
      await request<void>('/rider/session');
      return true;
    } catch {
      return false;
    }
  }
  return getSession();
}

export async function startRiderSession(): Promise<void> {
  if (isRemote()) {
    await request<void>('/rider/session', { method: 'POST' });
    return;
  }
  saveSession(true);
  riderProfile = { ...getProfile(), status: 'online' };
  saveProfile();
}

export async function registerRiderProfile(profile: Partial<RiderProfile>): Promise<RiderProfile> {
  if (isRemote()) {
    const remote = await request<RiderProfile>('/rider/register', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
    riderProfile = remote;
    saveProfile();
    return remote;
  }
  riderProfile = { ...getProfile(), ...profile, status: 'online' };
  saveProfile();
  saveSession(true);
  return { ...riderProfile };
}

export async function updateRiderProfile(profile: Partial<RiderProfile>): Promise<RiderProfile> {
  if (isRemote()) {
    const remote = await request<RiderProfile>('/rider/profile', {
      method: 'PATCH',
      body: JSON.stringify(profile),
    });
    riderProfile = remote;
    saveProfile();
    return remote;
  }
  riderProfile = { ...getProfile(), ...profile };
  saveProfile();
  return { ...riderProfile };
}

export async function resetRiderSession(): Promise<void> {
  if (isRemote()) {
    await request<void>('/rider/session', { method: 'DELETE' });
    setAuthToken(null);
    return;
  }
  riderProfile = { ...defaultProfile, status: 'offline' };
  saveProfile();
  saveSession(false);
}