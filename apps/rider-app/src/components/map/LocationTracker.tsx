import { useEffect, useRef } from 'react';

import { useLocationStore } from '../../store/useLocationStore';

export function LocationTracker() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const report = async () => {
      try {
        await useLocationStore.getState().report();
      } catch {}
    };

    intervalRef.current = setInterval(() => void report(), 30_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return null;
}
