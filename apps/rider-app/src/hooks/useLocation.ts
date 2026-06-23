import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

import { DEFAULT_COORDINATES } from '../utils/constants';
import { useLocationStore } from '../store/useLocationStore';
import type { Coordinates } from '../types/common';

export function useLocation() {
  const [coordinates, setCoordinates] = useState<Coordinates>(DEFAULT_COORDINATES);
  const [isTracking, setIsTracking] = useState(false);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      setIsTracking(true);

      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        const coords: Coordinates = {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
        };
        setCoordinates(coords);
        useLocationStore.getState().setCoordinates(coords);
      }

      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 15_000 },
        (loc) => {
          const coords: Coordinates = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setCoordinates(coords);
          useLocationStore.getState().setCoordinates(coords);
        },
      );
    };

    void startTracking();

    return () => {
      subRef.current?.remove();
      subRef.current = null;
      setIsTracking(false);
    };
  }, []);

  return { coordinates, isTracking };
}
