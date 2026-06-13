import { Platform } from 'react-native';

import type { Coordinates } from '../../types/common';

type CustomerMarkerProps = {
  coordinate: Coordinates;
  title?: string;
};

function CustomerMarkerNative({ coordinate, title = 'Delivery' }: CustomerMarkerProps) {
  const { Marker } = require('react-native-maps');
  return (
    <Marker
      coordinate={{ latitude: coordinate.latitude, longitude: coordinate.longitude }}
      title={title}
      pinColor="#463200"
    />
  );
}

export function CustomerMarker(props: CustomerMarkerProps) {
  if (Platform.OS === 'web') return null;
  return <CustomerMarkerNative {...props} />;
}
