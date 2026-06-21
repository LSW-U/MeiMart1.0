import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, shadowPresets } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { TimelineStep } from '@/components/business/TimelineStep';
import type { OrderTimelineCardProps } from './OrderTimelineCard.types';

export function OrderTimelineCard({ steps, currentIndex, title, testID }: OrderTimelineCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const headerTitle = title ?? t('order.progress');

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: colors['surface-container-lowest'] },
        shadowPresets.sm,
      ]}
    >
      <View style={styles.cardHeader}>
        <Icon symbol="timeline" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>{headerTitle}</Text>
      </View>
      <TimelineStep steps={steps} currentIndex={currentIndex} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography['body-md'],
    fontWeight: '700',
  },
});
