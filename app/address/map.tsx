import { StyleSheet, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function MapPickPage() {
  const { colors } = useTheme();

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="选择地址" showBack onBackPress={() => router.back()} />
      <View style={styles.body}>
        <View style={[styles.mapPlaceholder, { backgroundColor: colors['surface-container-low'] }]}>
          <Text style={[styles.mapText, { color: colors['on-surface-variant'] }]}>地图加载中…</Text>
          <Text style={[styles.mapHint, { color: colors['on-surface-variant'] }]}>
            （react-native-maps 集成）
          </Text>
        </View>
        <Card>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>附近位置</Text>
          {['帝力市中心', '帝力大学', '基督像', '帝力港口', 'Tais 市场'].map((loc, idx) => (
            <Pressable
              key={loc}
              testID={`map-loc-${idx}`}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.locRow,
                idx > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors['outline-variant'],
                },
                { opacity: pressed ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.locName, { color: colors['on-surface'] }]}>{loc}</Text>
                <Text style={[styles.locDesc, { color: colors['on-surface-variant'] }]}>
                  Timor-Leste
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>
      </View>
      <View style={styles.footer}>
        <Button
          label="确定"
          variant="primary"
          fullWidth
          onPress={() => router.back()}
          testID="map-confirm"
        />
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.md },
  mapPlaceholder: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  mapText: { ...typography.h3, fontWeight: '700' },
  mapHint: { ...typography['label-caps'] },
  sectionTitle: { ...typography['body-md'], fontWeight: '600', marginBottom: spacing.sm },
  locRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 56,
  },
  locName: { ...typography['body-md'], fontWeight: '500' },
  locDesc: { ...typography['body-sm'] },
  footer: { padding: spacing.lg },
});
