import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

import type { ButtonProps } from './Button.types';

const SIZE_HEIGHT: Record<NonNullable<ButtonProps['size']>, number> = {
  sm: 36,
  md: 44,
  lg: 52,
};

const SIZE_PADDING: Record<NonNullable<ButtonProps['size']>, number> = {
  sm: 12,
  md: 16,
  lg: 20,
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  label,
  onPress,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const bgByVariant: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: colors.primary,
    secondary: colors['secondary-container'],
    text: 'transparent',
    outline: 'transparent',
  };

  const textColorByVariant: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: colors['on-primary'],
    secondary: colors['on-secondary-container'],
    text: colors.primary,
    outline: colors.primary,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height: SIZE_HEIGHT[size],
          paddingHorizontal: SIZE_PADDING[size],
          backgroundColor: bgByVariant[variant],
          opacity: isDisabled ? 0.5 : pressed ? 0.7 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.outline },
      ]}
    >
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator
            color={textColorByVariant[variant]}
            size="small"
            accessibilityLabel="Loading"
          />
        )}
        <Text
          style={[
            styles.label,
            {
              color: textColorByVariant[variant],
              fontSize: size === 'sm' ? 14 : 16,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
