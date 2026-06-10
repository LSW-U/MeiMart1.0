import type { Coordinates } from '@/src/types/common';
import { DEFAULT_COORDINATES } from '@/src/utils/constants';

export function useLocationStore() {
  return {
    coordinates: DEFAULT_COORDINATES as Coordinates,
    setCoordinates: (_coordinates: Coordinates) => undefined,
  };
}
