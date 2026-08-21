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
  style,
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
    <View style={[styles.container, variant === 'bare' && styles.containerBare]}>
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
            // P29 原型 .field-input：1.5px var(--outline) 描边 + surface-lowest 白底 + err 怄 error；
            // ⚠️ HTML 变量名与 RN token 名错位：HTML --outline(#fae8e6)=RN surface-variant，
            // HTML --outline-v(#e1bfba)=RN outline-variant（边框用前者，placeholder 用后者）
            backgroundColor: hasError
              ? colors['error-container']
              : variant === 'bare'
                ? 'transparent'
                : colors['surface-container-lowest'],
            borderColor: hasError
              ? colors.error
              : variant === 'bare'
                ? 'transparent'
                : colors['surface-variant'],
            borderWidth: variant === 'bare' && !hasError ? 0 : 1.5,
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
            {/* .prefix-block 分隔线：1.5px var(--outline)（= surface-variant 浅粉） */}
            <View style={[styles.prefixDivider, { backgroundColor: colors['surface-variant'] }]} />
          </View>
        )}
        <TextInput
          ref={inputRef}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors['outline-variant']}
          secureTextEntry={secureTextEntry}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          // 调用方 style（如 bareInput 的 flex:1）应用到 TextInput 本体——原实现不解构 style 静默丢弃导致布局塌
          style={[styles.input, { color: colors['on-surface'] }, style]}
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
    // .field{gap:6px}——label 与输入框间距
    gap: 6,
  },
  // bare：width 100% 会让行内兄弟（如字数计数）被挤出容器——收 auto 随内容收缩
  containerBare: {
    width: 'auto',
    flex: 1,
  },
  // .field-label{11px 700 on-sv letter-spacing .08em uppercase}
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  // .field-input{height:50px;border:1.5px solid outline;圆角 12;padding 0 14px;gap:10px}
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputWrapperBare: {
    minHeight: 40,
    paddingHorizontal: 0,
  },
  input: {
    flex: 1,
    minHeight: 24,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
    includeFontPadding: false,
  },
  icon: {
    margin: 0,
  },
  // P29-D10: HTML .prefix-block —— +670 代码 15/700 primary + 右侧 1.5px 分隔线
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
  // .field-err{11px error}
  helper: {
    fontSize: 11,
    marginTop: 4,
  },
});
