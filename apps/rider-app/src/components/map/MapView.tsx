import { colors } from "../../theme/colors";
import { Platform, Text, View } from 'react-native';

import type { Coordinates } from '../../types/common';

type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

type MapViewProps = {
  pickup?: Coordinates & { title?: string };
  delivery?: Coordinates & { title?: string };
  rider?: Coordinates;
  region?: Region;
  onRegionChange?: (region: Region) => void;
  children?: React.ReactNode;
};

const DEFAULT_LAT = -8.5569;
const DEFAULT_LNG = 125.5603;

function MapViewNative({ pickup, delivery, rider, region, onRegionChange, children }: MapViewProps) {
  const { default: MapViewRN, Marker, PROVIDER_DEFAULT } = require('react-native-maps');

  const initialRegion = region ?? {
    latitude: pickup?.latitude ?? DEFAULT_LAT,
    longitude: pickup?.longitude ?? DEFAULT_LNG,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <MapViewRN
      className="w-full"
      style={{ height: 320 }}
      initialRegion={initialRegion}
      region={region}
      onRegionChange={onRegionChange}
      provider={PROVIDER_DEFAULT}
      showsUserLocation={!!rider}
      showsMyLocationButton={false}
    >
      {pickup && (
        <Marker
          coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
          title={pickup.title ?? 'Pickup'}
          pinColor={colors.primary}
        />
      )}
      {delivery && (
        <Marker
          coordinate={{ latitude: delivery.latitude, longitude: delivery.longitude }}
          title={delivery.title ?? 'Delivery'}
          pinColor={colors.tertiary}
        />
      )}
      {rider && (
        <Marker
          coordinate={{ latitude: rider.latitude, longitude: rider.longitude }}
          title="You"
          pinColor={colors.text}
        />
      )}
      {children}
    </MapViewRN>
  );
}

function MapViewPlaceholder({ pickup, delivery }: MapViewProps) {
  return (
    <View className="w-full items-center justify-center bg-surface-frame" style={{ height: 320 }}>
      <View className="items-center gap-2">
        <Text className="text-4xl text-primary/40">MAP</Text>
        <Text className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {pickup && delivery ? `${pickup.title ?? 'P'} → ${delivery.title ?? 'D'}` : 'Map view'}
        </Text>
        <Text className="mt-1 text-[10px] text-outline">Available on iOS / Android</Text>
      </View>
    </View>
  );
}

export function MapView(props: MapViewProps) {
  if (Platform.OS === 'web') return <MapViewPlaceholder {...props} />;
  return <MapViewNative {...props} />;
}
