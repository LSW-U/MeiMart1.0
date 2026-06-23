import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

import type { AvatarProps, AvatarSize } from './Avatar.types';

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 44,
  lg: 64,
};

export function Avatar({
  uri,
  size = 'md',
  editable = false,
  onPress,
  fallback = 'M',
  testID,
}: AvatarProps) {
  const { colors } = useTheme();
  const dimension = SIZE_MAP[size];

  const initials = fallback.slice(0, 2).toUpperCase();

  const inner = (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: colors['secondary-container'],
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }}
          accessibilityLabel="Avatar image"
        />
      ) : (
        <Text
          style={[
            styles.fallback,
            {
              color: colors['on-secondary-container'],
              fontSize: dimension / 2.5,
            },
          ]}
        >
          {initials}
        </Text>
      )}
      {editable && (
        <View
          style={[
            styles.editBadge,
            {
              backgroundColor: colors.primary,
              borderColor: colors.surface,
            },
          ]}
        >
          <MaterialCommunityIcons name="pencil" size={dimension / 4} color={colors['on-primary']} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="imagebutton"
        accessibilityLabel="Avatar"
        accessibilityHint={editable ? 'Edit avatar' : 'View avatar'}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View testID={testID} accessibilityRole="image" accessibilityLabel="Avatar">
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallback: {
    fontWeight: '700',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
