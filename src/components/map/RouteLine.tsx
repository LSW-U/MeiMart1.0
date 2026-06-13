import { Marker, Polyline } from 'react-native-maps';

import type { Coordinates } from '../../types/common';

type RouteLineProps = {
  pickup: Coordinates;
  delivery: Coordinates;
  strokeColor?: string;
  strokeWidth?: number;
};

export function RouteLine({ pickup, delivery, strokeColor = '#720003', strokeWidth = 3 }: RouteLineProps) {
  const coordinates = [
    { latitude: pickup.latitude, longitude: pickup.longitude },
    { latitude: delivery.latitude, longitude: delivery.longitude },
  ];

  return (
    <>
      <Polyline coordinates={coordinates} strokeColor={strokeColor} strokeWidth={strokeWidth} lineDashPattern={[8, 4]} />
      <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }} anchor={{ x: 0.5, y: 0.5 }} />
    </>
  );
}
