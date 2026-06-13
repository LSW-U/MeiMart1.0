import { Platform, Text, View } from 'react-native';

import type { Coordinates } from '../../types/common';

type RouteLineProps = {
  pickup: Coordinates;
  delivery: Coordinates;
  strokeColor?: string;
  strokeWidth?: number;
};

function RouteLineNative({ pickup, delivery, strokeColor = '#720003', strokeWidth = 3 }: RouteLineProps) {
  const { Marker, Polyline } = require('react-native-maps');

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

function RouteLinePlaceholder({ pickup, delivery }: RouteLineProps) {
  return (
    <View className="items-center justify-center py-4">
      <Text className="text-sm font-semibold text-[#720003]">
        {pickup.latitude.toFixed(2)}, {pickup.longitude.toFixed(2)} → {delivery.latitude.toFixed(2)}, {delivery.longitude.toFixed(2)}
      </Text>
    </View>
  );
}

export function RouteLine(props: RouteLineProps) {
  if (Platform.OS === 'web') return <RouteLinePlaceholder {...props} />;
  return <RouteLineNative {...props} />;
}
