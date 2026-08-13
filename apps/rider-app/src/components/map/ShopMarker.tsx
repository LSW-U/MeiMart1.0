import { colors } from "../../theme/colors";
import { Platform } from 'react-native';

import type { Coordinates } from '../../types/common';

type ShopMarkerProps = {
  coordinate: Coordinates;
  title?: string;
};

function ShopMarkerNative({ coordinate, title = 'Pickup' }: ShopMarkerProps) {
  const { Marker } = require('react-native-maps');
  return (
    <Marker
      coordinate={{ latitude: coordinate.latitude, longitude: coordinate.longitude }}
      title={title}
      pinColor={colors.primary}
    />
  );
}

export function ShopMarker(props: ShopMarkerProps) {
  if (Platform.OS === 'web') return null;
  return <ShopMarkerNative {...props} />;
}
