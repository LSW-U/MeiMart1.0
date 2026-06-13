import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

import type { SwitchProps } from './Switch.types';

const TRACK_W = 52;
const TRACK_H = 32;
const KNOB = 24;
const PADDING = (TRACK_H - KNOB) / 2;

export function Switch({ value, onValueChange, label, disabled = false, testID }: SwitchProps) {
  const { colors } = useTheme();
  const trackBg = value ? colors.primary : colors['outline-variant'];
  const knobBg = colors.surface;

  const row = (
    <View
      style={[
        styles.track,
        { backgroundColor: trackBg, opacity: disabled ? 0.5 : 1 },
        value && styles.trackOn,
      ]}
    >
      <View
        style={[
          styles.knob,
          {
            backgroundColor: knobBg,
            transform: [{ translateX: value ? KNOB + PADDING : PADDING }],
          },
        ]}
      />
    </View>
  );

  if (label) {
    return (
      <Pressable
        testID={testID}
        onPress={() => !disabled && onValueChange?.(!value)}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled }}
        style={styles.row}
      >
        <Text style={[styles.label, { color: colors['on-surface'] }]}>{label}</Text>
        {row}
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={() => !disabled && onValueChange?.(!value)}
      accessibilityRole="switch"
      accessibilityLabel="Toggle"
      accessibilityState={{ checked: value, disabled }}
    >
      {row}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    gap: 8,
  },
  label: {
    fontSize: 14,
    flexShrink: 1,
  },
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    padding: PADDING,
    justifyContent: 'center',
  },
  trackOn: {},
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
