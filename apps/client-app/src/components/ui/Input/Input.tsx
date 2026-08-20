import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, symbolToMc } from '@/theme';

import type { InputProps } from './Input.types';

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  prefix,
  variant = 'filled',
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
  const inputRef = useRef<TextInput>(null);
  const hasError = Boolean(error);
  // P29-D11: 图标名经 symbolToMc 解析（HTML Material Symbols 名 → MC 名）；
  // 旧调用方直接传 MC 名（如 'lock'）也在映射表命中自身，行为不变
  const resolvedLeftIcon = leftIcon ? symbolToMc(leftIcon) : undefined;
  const resolvedRightIcon = rightIcon ? symbolToMc(rightIcon) : undefined;

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
          variant === 'bare' && styles.inputWrapperBare,
          {
            // bare 变体：无底色无边框（行式卡片内嵌）；错误态仍保留红边可辨识
            backgroundColor: variant === 'bare' ? 'transparent' : colors['surface-variant'],
            borderColor: hasError ? colors.error : variant === 'bare' ? 'transparent' : colors['outline-variant'],
            borderWidth: hasError ? 1.5 : variant === 'bare' ? 0 : 1,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {leftIcon && (
          <MaterialCommunityIcons
            name={resolvedLeftIcon}
            size={20}
            color={colors['on-surface-variant']}
            style={styles.icon}
          />
        )}
        {prefix && (
          <View style={styles.prefixWrap}>
            <Text style={[styles.prefixText, { color: colors.primary }]}>{prefix}</Text>
            <View style={[styles.prefixDivider, { backgroundColor: colors['outline-variant'] }]} />
          </View>
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
              name={resolvedRightIcon}
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
    // bare 变体（行式卡片内嵌）padding 收敛，由外层行提供留白
    paddingHorizontal: 12,
    gap: 8,
  },
  inputWrapperBare: {
    minHeight: 40,
    paddingHorizontal: 0,
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
  // P29-D10: HTML .prefix-block —— +670 代码 + 右侧 1.5px 分隔线
  prefixWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    marginRight: 4,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '700',
  },
  prefixDivider: {
    width: 1.5,
    height: 24,
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
