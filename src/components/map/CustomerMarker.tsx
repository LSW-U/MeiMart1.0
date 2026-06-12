import { Marker } from 'react-native-maps';

import type { Coordinates } from '../../types/common';

type CustomerMarkerProps = {
  coordinate: Coordinates;
  title?: string;
};

export function CustomerMarker({ coordinate, title = 'Delivery' }: CustomerMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: coordinate.latitude, longitude: coordinate.longitude }}
      title={title}
      pinColor="#463200"
    />
  );
}
