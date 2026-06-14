import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing } from '@/theme';
import type { TimelineStepProps } from './TimelineStep.types';

export function TimelineStep({
  steps,
  currentIndex = steps.length - 1,
  testID,
}: TimelineStepProps) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={styles.container} accessibilityRole="list">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;
        const color = isActive
          ? colors.primary
          : isCompleted
            ? colors.tertiary
            : colors['outline-variant'];
        return (
          <View key={i} style={styles.row}>
            <View style={styles.indicatorCol}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor: isActive || isCompleted ? color : 'transparent',
                    borderColor: color,
                  },
                ]}
              >
                {(isActive || isCompleted) && (
                  <MaterialCommunityIcons name="check" size={14} color={colors['on-primary']} />
                )}
              </View>
              {i < steps.length - 1 && (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor:
                        i < currentIndex ? colors.tertiary : colors['outline-variant'],
                    },
                  ]}
                />
              )}
            </View>
            <View style={styles.textCol}>
              <Text
                style={[
                  textStyle('body-md'),
                  {
                    color: isActive ? colors.primary : colors['on-surface'],
                    fontWeight: isActive ? '700' : '400',
                  },
                ]}
              >
                {step.status}
              </Text>
              {step.description ? (
                <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
                  {step.description}
                </Text>
              ) : null}
              {step.location ? (
                <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
                  📍 {step.location}
                </Text>
              ) : null}
              <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
                {new Date(step.timestamp).toLocaleString()}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  indicatorCol: { alignItems: 'center', width: 24 },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { width: 2, flex: 1, minHeight: 24 },
  textCol: { flex: 1, paddingBottom: spacing.sm, gap: 2 },
});
