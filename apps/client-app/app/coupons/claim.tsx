// ⚠️ 无 HTML 原型，参考 coupons.tsx（我的卡包，其本身参考 OrderListPage 推导）+ 领券中心方案 A 设计，待设计确认
// 领券中心页 — 展示后台创建的可领券模板（GET /client/coupons/available），
// 领取（POST /client/coupons/:promotionId/claim）生成 UserCoupon 进我的卡包。
// 决策：A1（入口在 coupons.tsx 顶部 banner）+ B1（复用 CouponCard + action='claim'）
//      + C1（领取成功 toast + 留本页，已领卡乐观消失）+ D2（不显示剩余量）
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { CouponCard } from '@/components/business/CouponCard';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { PageErrorBoundary } from '@/components/feedback/PageErrorBoundary/PageErrorBoundary';
import { useWeakNetworkUI } from '@/hooks/useWeakNetworkUI';
import { useAvailableCoupons, useClaimCoupon } from '@/services/queries/usePromotion';
import { toast } from '@/store/toastStore';
import { getApiErrorMessage } from '@/utils/error';
import type { ClientCoupon } from '@/services/promotion';

export default function CouponClaimPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isOffline } = useWeakNetworkUI();
  const availableQ = useAvailableCoupons();
  const claimMutation = useClaimCoupon();

  const handleClaim = (coupon: ClientCoupon) => {
    claimMutation.mutate(coupon.id, {
      onSuccess: () => toast.success(t('claim.claimed', { defaultValue: 'Claimed' })),
      onError: (err) => toast.error(getApiErrorMessage(err, t('errors.generic'))),
    });
  };

  const coupons = availableQ.data ?? [];

  return (
    <PageErrorBoundary pageName="coupons-claim">
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
      <StatusBarConfig />
      <PrimaryHeader title={t('claim.title', { defaultValue: 'Coupon Center' })} showBack onBackPress={handleBack} />
      {isOffline && <OfflineBanner />}

      {/* C1：顶部「我的卡包」入口（领完直接跳过去看新券） */}
      <Pressable
        onPress={() => router.push('/coupons')}
        style={({ pressed }) => [
          styles.myCouponsEntry,
          { borderColor: colors.primary },
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('claim.goMyCoupons', { defaultValue: 'My Coupons' })}
        testID="claim-go-my-coupons"
      >
        <Text style={[styles.myCouponsText, { color: colors.primary }]}>
          {t('claim.goMyCoupons', { defaultValue: 'My Coupons' })}
        </Text>
      </Pressable>

      {availableQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : availableQ.isError ? (
        <ErrorState message={t('coupons.loadError')} onRetry={() => availableQ.refetch()} />
      ) : coupons.length === 0 ? (
        <EmptyState
          title={t('claim.empty', { defaultValue: 'No coupons to claim' })}
          description={t('claim.emptyDesc', { defaultValue: 'Browse my coupons' })}
          icon="ticket-percent"
        />
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item.id}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }: { item: ClientCoupon }) => (
            <View style={shadowPresets.sm}>
              <CouponCard
                coupon={item}
                action="claim"
                onClaim={handleClaim}
                claiming={claimMutation.isPending && claimMutation.variables === item.id}
                testID={`claim-card-${item.id}`}
              />
            </View>
          )}
        />
      )}
      </SafeAreaWrapper>
    </PageErrorBoundary>
  );
}

const styles = StyleSheet.create({
  myCouponsEntry: {
    marginHorizontal: layout['container-margin'],
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: 999,
    alignSelf: 'flex-end',
  },
  myCouponsText: {
    fontWeight: '600',
    fontSize: 13,
  },
  list: {
    padding: layout['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
