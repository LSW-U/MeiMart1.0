import { create } from 'zustand';

import type { Coordinates } from '../types/common';
import { reportLocation } from '../services/location';
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
    await reportLocation(get().coordinates);
  },
}));
