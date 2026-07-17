// SelectField — 表单选择字段（用 Modal 替代 Alert，Web/Native 都支持）
import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, FlatList } from 'react-native';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { useTheme, typography, borderRadius } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';

interface SelectFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  icon: string;
  placeholder?: string;
  options: string[];
  testID?: string;
}

export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  icon,
  placeholder = 'Select',
  options,
  testID,
}: SelectFieldProps<T>) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <View style={styles.labelRow}>
        <Icon symbol={icon} size={16} color={colors['on-surface-variant']} />
        <Text style={[styles.label, { color: colors['on-surface-variant'] }]}>{label}</Text>
      </View>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <>
            <Pressable
              onPress={() => setVisible(true)}
              testID={testID}
              style={[
                styles.selectBox,
                {
                  backgroundColor: colors['surface-container-lowest'],
                  borderColor: colors['outline-variant'],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Select ${label}, current ${value || 'none'}`}
            >
              <Text
                style={[
                  styles.selectText,
                  { color: value ? colors['on-surface'] : colors['on-surface-variant'] },
                ]}
                numberOfLines={1}
              >
                {value || placeholder}
              </Text>
              <Icon symbol="expand_more" size={20} color={colors['on-surface-variant']} />
            </Pressable>
            <Modal
              visible={visible}
              onClose={() => setVisible(false)}
              title={label}
              testID={`${testID}-modal`}
            >
              <FlatList
                data={options}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      onChange(item);
                      setVisible(false);
                    }}
                    style={[
                      styles.optionItem,
                      item === value && { backgroundColor: colors['primary-container'] },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${item}`}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: item === value ? colors.primary : colors['on-surface'],
                          fontWeight: item === value ? '700' : '400',
                        },
                      ]}
                    >
                      {item}
                    </Text>
                    {item === value && (
                      <Icon symbol="check" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                )}
                ItemSeparatorComponent={() => (
                  <View style={[styles.separator, { backgroundColor: colors['outline-variant'] }]} />
                )}
              />
            </Modal>
          </>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  label: {
    ...typography['label-caps'],
    fontSize: 11,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectText: {
    ...typography['body-md'],
    flex: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionText: {
    ...typography['body-md'],
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
