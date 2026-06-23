import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme, textStyle, spacing, shadowPresets } from '@/theme';
import type { SearchBarProps } from './SearchBar.types';

export function SearchBar({
  value,
  defaultValue,
  placeholder = 'Search products',
  variant = 'card',
  showMic = false,
  onMicPress,
  iconColor,
  onSearch,
  onChange,
  onSubmit,
  onClear,
  autoFocus = false,
  testID,
}: SearchBarProps) {
  const { colors } = useTheme();
  const [internal, setInternal] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const handleChange = (text: string) => {
    if (!isControlled) setInternal(text);
    onChange?.(text);
  };

  const handleSubmit = () => {
    onSearch?.(current);
    onSubmit?.(current);
  };

  const handleClear = () => {
    handleChange('');
    onClear?.();
  };

  const isCard = variant === 'card';
  const leadingIconColor = iconColor ?? (isCard ? colors.outline : colors.primary);
  const containerBg = isCard ? colors['surface-container-lowest'] : 'rgba(255,255,255,0.1)';
  const borderColor = isCard ? colors['outline-variant'] : 'rgba(255,255,255,0.2)';
  const textColor = isCard ? colors['on-surface'] : '#ffffff';
  const placeholderColor = isCard ? colors['on-surface-variant'] : 'rgba(255,255,255,0.7)';

  return (
    <View
      style={[
        styles.container,
        isCard ? shadowPresets.sm : null,
        {
          backgroundColor: containerBg,
          borderColor,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: isCard ? 12 : 999,
          height: isCard ? 48 : 44,
        },
      ]}
      testID={testID}
      accessibilityRole="search"
    >
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color={leadingIconColor}
        style={styles.leadingIcon}
      />
      <TextInput
        value={current}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        onChangeText={handleChange}
        onSubmitEditing={handleSubmit}
        autoFocus={autoFocus}
        returnKeyType="search"
        style={[textStyle('body-md'), { color: textColor, flex: 1 }]}
        accessibilityLabel="Search input"
      />
      {showMic && (
        <Pressable
          onPress={onMicPress}
          hitSlop={8}
          style={styles.trailingBtn}
          accessibilityRole="button"
          accessibilityLabel="Voice search"
        >
          <MaterialCommunityIcons name="microphone" size={20} color={leadingIconColor} />
        </Pressable>
      )}
      {current.length > 0 && (
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          style={styles.trailingBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={16}
            color={isCard ? colors['on-surface-variant'] : 'rgba(255,255,255,0.7)'}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  leadingIcon: { marginRight: 2 },
  trailingBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
