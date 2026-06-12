import { Marker } from 'react-native-maps';

import type { Coordinates } from '../../types/common';

type RiderMarkerProps = {
  coordinate: Coordinates;
  title?: string;
};

export function RiderMarker({ coordinate, title = 'You' }: RiderMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: coordinate.latitude, longitude: coordinate.longitude }}
      title={title}
      pinColor="#261816"
    />
  );
}
