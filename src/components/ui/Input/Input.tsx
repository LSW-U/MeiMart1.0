import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

import type { InputProps } from './Input.types';

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  value,
  onChangeText,
  placeholder,
  helperText,
  secureTextEntry,
  disabled,
  testID,
  autoFocus,
}: InputProps) {
  const { colors } = useTheme();
  const inputRef = useRef<any>(null);
  const hasError = Boolean(error);

  // Use a controlled "native" TextInput via require to avoid extra imports typing
  const { TextInput } = require('react-native');

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[styles.label, { color: colors['on-surface-variant'] }]}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors['surface-variant'],
            borderColor: hasError ? colors.error : colors['outline-variant'],
            borderWidth: hasError ? 1.5 : 1,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {leftIcon && (
          <MaterialCommunityIcons
            name={leftIcon as any}
            size={20}
            color={colors['on-surface-variant']}
            style={styles.icon}
          />
        )}
        <TextInput
          ref={inputRef}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors['on-surface-variant']}
          secureTextEntry={secureTextEntry}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: colors['on-surface'] }]}
          accessibilityLabel={label || placeholder}
          accessibilityState={{ disabled: !!disabled }}
        />
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            hitSlop={8}
            style={styles.iconPressable}
            accessibilityRole={onRightIconPress ? 'button' : 'image'}
            accessibilityLabel={onRightIconPress ? `${rightIcon} action` : rightIcon}
          >
            <MaterialCommunityIcons
              name={rightIcon as any}
              size={20}
              color={colors['on-surface-variant']}
            />
          </Pressable>
        )}
      </View>
      {hasError ? (
        <Text style={[styles.helper, { color: colors.error }]} accessibilityRole="alert">
          {error}
        </Text>
      ) : helperText ? (
        <Text style={[styles.helper, { color: colors['on-surface-variant'] }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 56,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: 4,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 24,
    fontSize: 16,
    padding: 0,
    includeFontPadding: false,
  },
  icon: {
    margin: 0,
  },
  iconPressable: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helper: {
    fontSize: 12,
    marginTop: 4,
  },
});
