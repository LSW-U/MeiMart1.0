import { StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing } from '@/theme';
import type { PageHeaderProps } from './PageHeader.types';

export function PageHeader({
  title,
  showBack = false,
  onBackPress,
  rightAction,
  testID,
}: PageHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.header,
        {
          backgroundColor: colors['surface-container-lowest'],
          borderBottomColor: colors['outline-variant'],
        },
      ]}
      accessibilityRole="header"
    >
      {showBack && (
        <Pressable
          onPress={onBackPress}
          hitSlop={8}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors['on-surface']} />
        </Pressable>
      )}
      <Text
        style={[
          textStyle('h3'),
          { color: colors['on-surface'], flex: 1, textAlign: showBack ? 'left' : 'center' },
        ]}
        numberOfLines={1}
      >
        {title ?? ''}
      </Text>
      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
