import { create } from 'zustand';

import type { Coordinates } from '../types/common';
import { DEFAULT_COORDINATES } from '../utils/constants';

type LocationState = {
  coordinates: Coordinates;
  setCoordinates: (coordinates: Coordinates) => void;
};

export const useLocationStore = create<LocationState>((set) => ({
  coordinates: DEFAULT_COORDINATES,
  setCoordinates: (coordinates) => set({ coordinates }),
}));
