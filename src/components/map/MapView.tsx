import MapViewRN, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';

import type { Coordinates } from '../../types/common';

type MapViewProps = {
  pickup?: Coordinates & { title?: string };
  delivery?: Coordinates & { title?: string };
  rider?: Coordinates;
  region?: Region;
  onRegionChange?: (region: Region) => void;
  children?: React.ReactNode;
};

const DEFAULT_REGION: Region = {
  latitude: -8.5569,
  longitude: 125.5603,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function MapView({ pickup, delivery, rider, region, onRegionChange, children }: MapViewProps) {
  const initialRegion = region ?? {
    latitude: pickup?.latitude ?? DEFAULT_REGION.latitude,
    longitude: pickup?.longitude ?? DEFAULT_REGION.longitude,
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
          pinColor="#720003"
        />
      )}
      {delivery && (
        <Marker
          coordinate={{ latitude: delivery.latitude, longitude: delivery.longitude }}
          title={delivery.title ?? 'Delivery'}
          pinColor="#463200"
        />
      )}
      {rider && (
        <Marker
          coordinate={{ latitude: rider.latitude, longitude: rider.longitude }}
          title="You"
          pinColor="#261816"
        />
      )}
      {children}
    </MapViewRN>
  );
}
