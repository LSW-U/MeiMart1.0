import { create } from 'zustand';

import type { Coordinates } from '../types/common';
import { locationApi } from '../services/location';
import { DEFAULT_COORDINATES } from '../utils/constants';

type LocationState = {
  coordinates: Coordinates;
  setCoordinates: (coordinates: Coordinates) => void;
  report: () => Promise<void>;
};

export const useLocationStore = create<LocationState>((set, get) => ({
  coordinates: DEFAULT_COORDINATES,
  setCoordinates: (coordinates) => set({ coordinates }),

  report: async () => {
    try {
      await locationApi.report(get().coordinates);
    } catch (e) {
      console.error('[useLocationStore] report failed:', e);
    }
  },
}));
