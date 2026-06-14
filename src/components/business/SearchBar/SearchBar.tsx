import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import type { SearchBarProps } from './SearchBar.types';

export function SearchBar({
  value,
  defaultValue,
  placeholder = 'Search products',
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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors['surface-variant'],
          borderRadius: borderRadius.full,
        },
      ]}
      testID={testID}
      accessibilityRole="search"
    >
      <MaterialCommunityIcons
        name="magnify"
        size={18}
        color={colors['on-surface-variant']}
        style={styles.leadingIcon}
      />
      <TextInput
        value={current}
        placeholder={placeholder}
        placeholderTextColor={colors['on-surface-variant']}
        onChangeText={handleChange}
        onSubmitEditing={handleSubmit}
        autoFocus={autoFocus}
        returnKeyType="search"
        style={[textStyle('body-md'), { color: colors['on-surface'], flex: 1 }]}
        accessibilityLabel="Search input"
      />
      {current.length > 0 && (
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={16}
            color={colors['on-surface-variant']}
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
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  leadingIcon: { marginRight: 4 },
  clearBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
