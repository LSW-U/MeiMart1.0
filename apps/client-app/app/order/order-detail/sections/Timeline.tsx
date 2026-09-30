// Custom Timeline（HTML 原型 B 方案：rail + fill 进度条 + node-head/desc + active 光晕）
// 批5 拆分：从 app/order/[id].tsx 原样搬移，行为零变更
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, spacing, typography } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import type { TimelineStepData } from '@/utils/timeline';
import { ON_PRIMARY } from '../shared';

export function Timeline({
  steps,
  progress,
}: {
  steps: TimelineStepData[];
  progress: number; // 0-1，进度条填充比例
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.timelineWrap}>
      <View style={[styles.timelineBgLine, { backgroundColor: colors['outline-variant'] }]} />
      <View
        style={[
          styles.timelineActiveLine,
          { backgroundColor: colors.primary, height: `${progress * 100}%` },
        ]}
      />

      {steps.map((step) => {
        const isCompleted = step.state === 'completed';
        const isActive = step.state === 'active';
        // Why: done = primary 实心 + check；active = 白底 + 3px primary 边 + 光晕 + bannerIcon；pending = 白底 + outline-v 边
        const dotBg = isCompleted ? colors.primary : colors['surface-container-lowest'];
        const dotBorder = isActive ? colors.primary : colors['outline-variant'];
        const labelColor = isActive
          ? colors.primary
          : isCompleted
            ? colors['on-surface']
            : colors['on-surface-variant'];
        const descColor = isActive ? colors['on-surface'] : colors['on-surface-variant'];
        return (
          <View key={step.id} style={styles.timelineStep}>
            <View
              style={[
                styles.timelineDot,
                {
                  backgroundColor: dotBg,
                  borderColor: dotBorder,
                  borderWidth: isActive ? 3 : 2,
                },
                // Why: active 光晕（HTML 原型 box-shadow: 0 0 0 4px rgba(150,24,19,0.08)）
                isActive && {
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowRadius: 4,
                  shadowOpacity: 0.08,
                  elevation: 2,
                },
              ]}
            >
              {isCompleted ? (
                <Icon symbol="check" size={10} color={ON_PRIMARY} />
              ) : isActive && step.icon ? (
                <Icon symbol={step.icon} size={12} color={colors.primary} />
              ) : null}
            </View>
            {/* node-head：状态标题（左）+ 真实时间戳（右） */}
            <View style={styles.timelineHead}>
              <Text style={[styles.bodyMdBold, { color: labelColor, flex: 1 }]} numberOfLines={1}>
                {step.label}
              </Text>
              {step.time ? (
                <Text
                  style={[styles.timelineTime, { color: colors['on-surface-variant'] }]}
                  numberOfLines={1}
                >
                  {step.time}
                </Text>
              ) : null}
            </View>
            {/* desc 描述行 */}
            <Text style={[styles.bodySm, { color: descColor }]}>{step.desc}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timelineWrap: {
    position: 'relative',
    paddingLeft: 28,
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  timelineBgLine: {
    position: 'absolute',
    left: 9,
    top: 14,
    bottom: 14,
    width: 2,
  },
  timelineActiveLine: {
    position: 'absolute',
    left: 9,
    top: 14,
    width: 2,
  },
  timelineStep: {
    position: 'relative',
    minHeight: 28,
  },
  timelineDot: {
    position: 'absolute',
    left: -28,
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Why: node-head 标题+时间戳右对齐（HTML 原型 .node-head flex space-between）
  timelineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  timelineTime: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bodyMdBold: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  bodySm: {
    ...typography['body-sm'],
  },
});
