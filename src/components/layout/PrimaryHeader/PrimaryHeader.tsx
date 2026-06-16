import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme, typography, spacing, shadowPresets } from '@/theme';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';
import type { PrimaryHeaderProps } from './PrimaryHeader.types';

export function PrimaryHeader({
  title,
  showBack = false,
  onBackPress,
  rightActions,
  showLocation = false,
  locationLabel,
  onLocationPress,
  testID,
}: PrimaryHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      testID={testID}
      style={[styles.header, { backgroundColor: colors.primary }, shadowPresets.lg]}
      accessibilityRole="header"
    >
      {/* tais-pattern 纹样背景（HTML 的 opacity-20） */}
      <View style={styles.bgPattern} pointerEvents="none">
        <TaisPattern width={400} height={120} opacity={0.2} />
      </View>

      <View style={styles.row}>
        {showBack ? (
          <Pressable
            onPress={onBackPress}
            hitSlop={8}
            style={styles.btn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon symbol="arrow_back" size={24} color="#ffffff" />
          </Pressable>
        ) : (
          <View style={styles.btnPlaceholder} />
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {showLocation && locationLabel && (
            <Pressable
              onPress={onLocationPress}
              style={styles.locationChip}
              accessibilityRole="button"
              accessibilityLabel={`Location: ${locationLabel}`}
            >
              <Icon symbol="location_on" size={14} color="#ffffff" />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationLabel}
              </Text>
              <Icon symbol="expand_more" size={14} color="#ffffff" />
            </Pressable>
          )}
        </View>

        {rightActions ? (
          <View style={styles.rightActions}>{rightActions}</View>
        ) : (
          <View style={styles.btnPlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: spacing['container-margin'],
    paddingVertical: spacing.md,
  },
  bgPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  btn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPlaceholder: {
    width: 0,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  title: {
    ...typography.h3,
    color: '#ffffff',
    fontWeight: '700',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  locationText: {
    ...typography['label-caps'],
    color: '#ffffff',
    fontSize: 10,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
