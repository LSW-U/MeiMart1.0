import { Marker } from 'react-native-maps';

import type { Coordinates } from '../../types/common';

type RouteLineProps = {
  pickup: Coordinates;
  delivery: Coordinates;
  strokeColor?: string;
};

export function RouteLine({ pickup, delivery, strokeColor = '#720003' }: RouteLineProps) {
  return (
    <Marker
      coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      {/* Polyline rendered via MapView children — RouteLine is a convenience wrapper marker */}
    </Marker>
  );
}
