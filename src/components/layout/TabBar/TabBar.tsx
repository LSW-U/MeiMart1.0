import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import type { TabBarProps } from './TabBar.types';

export function TabBar({ tabs, activeIndex, onTabChange, testID }: TabBarProps) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor: colors['surface-variant'] }]}
      accessibilityRole="tablist"
    >
      {tabs.map((tab, i) => {
        const isActive = i === activeIndex;
        return (
          <Pressable
            key={i}
            style={[
              styles.tab,
              isActive && {
                backgroundColor: colors.primary,
                borderRadius: borderRadius.md,
              },
            ]}
            onPress={() => onTabChange(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab}
          >
            <Text
              style={[
                textStyle('body-md'),
                {
                  color: isActive ? colors['on-primary'] : colors['on-surface-variant'],
                  fontWeight: isActive ? '700' : '400',
                },
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
});
