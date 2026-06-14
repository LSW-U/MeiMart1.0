import { StyleSheet, View, Text, ScrollView, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TimelineStep } from '@/components/business/TimelineStep';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TRACKING_STEPS = [
  {
    status: '已揽收',
    description: '商家已发货，快递员已揽收',
    timestamp: '2026-06-02 08:00',
    location: '北京分拨中心',
  },
  {
    status: '运输中',
    description: '包裹已发出，正在运往目的地',
    timestamp: '2026-06-02 14:00',
    location: '北京-上海',
  },
  {
    status: '到达派送点',
    description: '已到达目的地派送点',
    timestamp: '2026-06-03 08:00',
    location: '上海浦东派送点',
  },
  {
    status: '派送中',
    description: '快递员正在派送',
    timestamp: '2026-06-03 10:00',
    location: '上海浦东',
  },
];

export default function DeliveryTrackingPage() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="物流跟踪" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={styles.trackingHeader}>
            <MaterialCommunityIcons name="truck-fast" size={32} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.trackingNo, { color: colors['on-surface'] }]}>
                运单号: SF1234567890
              </Text>
              <Text style={[styles.trackingStatus, { color: colors['on-surface-variant'] }]}>
                包裹运输中
              </Text>
            </View>
            <Button label="复制" variant="text" size="sm" onPress={() => {}} testID="track-copy" />
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>物流信息</Text>
          <TimelineStep steps={TRACKING_STEPS} currentIndex={2} />
        </Card>
      </ScrollView>
      <View style={styles.bottomBar}>
        <Button
          label="联系客服"
          variant="outline"
          onPress={() => router.push('/service')}
          testID="track-cs"
        />
        <Button
          label="拨打电话"
          variant="primary"
          onPress={() => Linking.openURL('tel:95338')}
          testID="track-call"
        />
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  trackingHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  trackingNo: { ...typography['body-md'], fontWeight: '600' },
  trackingStatus: { ...typography['body-sm'] },
  sectionTitle: { ...typography['body-md'], fontWeight: '600', marginBottom: spacing.md },
  bottomBar: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
});

void useLocalSearchParams;
