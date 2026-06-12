import { Marker } from 'react-native-maps';

import type { Coordinates } from '../../types/common';

type ShopMarkerProps = {
  coordinate: Coordinates;
  title?: string;
};

export function ShopMarker({ coordinate, title = 'Pickup' }: ShopMarkerProps) {
  return (
    <Marker
      coordinate={{ latitude: coordinate.latitude, longitude: coordinate.longitude }}
      title={title}
      pinColor="#720003"
    />
  );
}
