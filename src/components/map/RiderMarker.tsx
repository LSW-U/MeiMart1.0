import { Platform } from 'react-native';

import type { Coordinates } from '../../types/common';

type RiderMarkerProps = {
  coordinate: Coordinates;
  title?: string;
};

function RiderMarkerNative({ coordinate, title = 'You' }: RiderMarkerProps) {
  const { Marker } = require('react-native-maps');
  return (
    <Marker
      coordinate={{ latitude: coordinate.latitude, longitude: coordinate.longitude }}
      title={title}
      pinColor="#261816"
    />
  );
}

export function RiderMarker(props: RiderMarkerProps) {
  if (Platform.OS === 'web') return null;
  return <RiderMarkerNative {...props} />;
}
