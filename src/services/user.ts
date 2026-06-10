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

let riderProfile: RiderProfile = { ...defaultProfile };

export async function getRiderProfile(): Promise<RiderProfile> {
  return { ...riderProfile };
}

export async function updateRiderProfile(profile: Partial<RiderProfile>): Promise<RiderProfile> {
  riderProfile = { ...riderProfile, ...profile };
  return { ...riderProfile };
}

export async function resetRiderSession(): Promise<void> {
  riderProfile = { ...defaultProfile, status: 'offline' };
}
