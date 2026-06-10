import { DEFAULT_COORDINATES } from '@/src/utils/constants';

export function useLocation() {
  return {
    coordinates: DEFAULT_COORDINATES,
    isTracking: false,
  };
}
