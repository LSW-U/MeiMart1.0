/**
 * 保证金详情页 — /settings/deposit（批 H 重构，2026-09-03 方案拍板）
 *
 * 三态信息架构（拍板 3/4/5/8）：
 *   - 未缴：红 hero（bg-danger-soft）+ 去缴纳入口；tier 缺失 → 「—/暂不可用」+ 重试
 *   - 已缴：绿 hero（bg-status-done-bg）+「追加缴纳」主行动 + 记录入口（仅一个）+
 *     升级提示由 /rider/deposit/tiers 派生（不写死 i18n 文案）
 *   - PENDING（未缴）：橙 hero（bg-warn-bg）+ 引导 banner + 记录入口；不渲染缴纳表单
 *   - 已缴 + PENDING 并存：绿 hero 保留当前余额/上限 + PENDING banner 另起（拍板 5）
 *
 * 缴纳表单已拆至子页 /settings/deposit/pay（拍板 6），本页仅三态展示 + 入口。
 * 页头沿用 SimplePageHeader 白色页头，返回「‹ 设置」（拍板 7）。
 *
 * 端点：GET /rider/deposit/status | /locations | /tiers（批 B/补端点批）
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '@/src/components/ui';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { SimplePageHeader } from '@/src/components/layout/SimplePageHeader';
import { colors } from '@/src/theme/colors';
import { useTranslation } from '@/src/i18n/useTranslation';
import { formatCurrency } from '@/src/utils/format';
import {
  useDepositStatus,
  useDepositLocations,
  useDepositTiers,
} from '@/src/services/queries/useDeposit';
import type { DepositRecord } from '@/src/services/deposit';

/** hero 语义 token（方案 §2.2 三态规范表，全部为 tailwind.config 既有 token） */
function heroVisual(state: 'paid' | 'unpaid' | 'pending') {
  switch (state) {
    case 'paid':
      return {
        card: 'border-status-done-text/20 bg-status-done-bg',
        amount: 'text-success-deep',
        badge: 'bg-status-done-bg',
        badgeText: 'text-status-done-text',
      };
    case 'pending':
      return {
        card: 'border-warn-border bg-warn-bg',
        amount: 'text-warn-text',
        badge: 'bg-warn-bg',
        badgeText: 'text-warn-text',
      };
    default:
      return {
        card: 'border-blush-border bg-danger-soft',
        amount: 'text-primary-container',
        badge: 'bg-danger-soft',
        badgeText: 'text-status-danger-text',
      };
  }
}

export default function DepositPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const currency = t('common.currency');

  const { data: status, isLoading, isError, refetch } = useDepositStatus();
  const locationsQuery = useDepositLocations();
  const tiersQuery = useDepositTiers();
  const locations = locationsQuery.data ?? [];

  const pendingRequest: DepositRecord | null =
    status?.recentRequests.find((r) => r.status === 'PENDING') ?? null;
  const depositAmount = status?.depositAmount ?? 0;
  const hasPaid = depositAmount > 0;
  const hasPending = pendingRequest !== null;
  // hero 主态：有余额走已缴绿 hero；未缴但有待确认申请走橙 hero
  const heroState: 'paid' | 'unpaid' | 'pending' = hasPaid
    ? 'paid'
    : hasPending
      ? 'pending'
      : 'unpaid';
  const visual = heroVisual(heroState);

  // 拍板 E：升级提示由 tiers 派生 —— 取「缴纳额 > 当前余额」的最低档
  const nextTier = (() => {
    const tiers = tiersQuery.data ?? [];
    return (
      [...tiers]
        .filter((tier) => tier.minAmount > depositAmount)
        .sort((a, b) => a.minAmount - b.minAmount)[0] ?? null
    );
  })();

  // 拍板 8：tier 缺失（未缴/无命中停用档回落）→ 「—/暂不可用」+ 重试；
  // tier 命中且 maxOrderAmount=null 是顶档合法「不限」，不在此列
  const tierMissing = status !== undefined && status.tier === null;
  const maxOrderAmount = status?.tier?.maxOrderAmount ?? null;

  /** 已缴态「追加缴纳」档位预设：跳 /pay 预填下一档金额；顶档（无下一档）预设
   * max($50, 当前余额)，避免「追加」给出低于现有余额的默认值（审查 P3-4） */
  function goPay(presetCents: number) {
    router.push({
      pathname: '/settings/deposit/pay',
      params: { presetAmount: String(presetCents) },
    });
  }

  function renderLimitBox() {
    return (
      <View className="flex-row items-center justify-between rounded-xl bg-surface/60 px-3 py-2.5">
        <View className="flex-1">
          <Text className="text-xs text-on-surface-variant">{t('deposit.hero.limitLabel')}</Text>
          {tierMissing ? (
            // 拍板 8：tier 缺失不显示「不限」，显示 —/暂不可用 + 重试
            <View className="mt-0.5 flex-row items-center gap-2">
              <Text className="text-xl font-bold text-on-surface-variant">—</Text>
              <Text className="text-xs text-on-surface-variant">
                {t('deposit.hero.limitUnavailable')}
              </Text>
              <PressableRetry onPress={() => void refetch()} />
            </View>
          ) : (
            <Text className="text-xl font-bold text-primary-container">
              {maxOrderAmount === null
                ? t('deposit.hero.limitUnlimited')
                : formatCurrency(maxOrderAmount / 100, currency)}
            </Text>
          )}
        </View>
        {heroState !== 'unpaid' && (
          <View
            accessibilityLabel={
              heroState === 'paid' ? t('deposit.badge.a11y.paid') : t('deposit.badge.a11y.pending')
            }
            className={`rounded-lg px-2.5 py-1 ${visual.badge}`}
          >
            <Text className={`text-xs font-bold ${visual.badgeText}`}>
              {heroState === 'paid' ? t('deposit.badge.currentTier') : t('deposit.badge.pending')}
            </Text>
          </View>
        )}
      </View>
    );
  }

  function renderPendingHero() {
    if (!pendingRequest) return null;
    const locationName = locations.find((l) => l.id === pendingRequest.locationId)?.name ?? null;
    return (
      <>
        <View className={`rounded-3xl border p-5 ${heroVisual('pending').card}`}>
          <Text className="text-sm text-on-surface-variant">{t('deposit.hero.pendingLabel')}</Text>
          <View className="mt-1 flex-row items-end justify-between">
            <Text className="text-4xl font-extrabold text-warn-text">
              {formatCurrency(pendingRequest.requestedAmount / 100, currency)}
            </Text>
            <View
              accessibilityLabel={t('deposit.badge.a11y.pending')}
              className="rounded-lg bg-warn-bg px-2.5 py-0.5"
            >
              <Text className="text-xs font-bold text-warn-text">{t('deposit.badge.pending')}</Text>
            </View>
          </View>
          <View className="mt-3 flex-row justify-between rounded-xl bg-surface/60 px-3 py-2.5">
            <View>
              <Text className="text-xs text-on-surface-variant">
                {t('deposit.hero.locationLabel')}
              </Text>
              {/* 方案 §5.3：缴纳点缺失显示「—」，不 fallback 成「所选缴纳点」 */}
              <Text className="text-sm font-bold text-on-surface">{locationName ?? '—'}</Text>
            </View>
            <View>
              <Text className="text-xs text-on-surface-variant">
                {t('deposit.hero.submittedAt')}
              </Text>
              <Text className="text-sm font-bold text-on-surface">
                {new Date(pendingRequest.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
        {/* PENDING 引导 banner（HTML pending-banner；缺缴纳点降级文案，不渲染空位置名） */}
        <View className="flex-row items-start gap-2 rounded-xl border border-warn-border bg-warn-bg px-3.5 py-2.5">
          <AppIcon color={colors.warnText} name="info" size={16} />
          <Text className="flex-1 text-xs leading-5 text-warn-text">
            {locationName
              ? t('deposit.pending.bannerText', {
                  location: locationName,
                  amount: formatCurrency(pendingRequest.requestedAmount / 100, currency),
                })
              : t('deposit.pending.bannerTextNoLocation', {
                  amount: formatCurrency(pendingRequest.requestedAmount / 100, currency),
                })}
          </Text>
        </View>
      </>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <SimplePageHeader
        backLabel={t('deposit.page.backToSettings')}
        fallbackHref="/settings"
        title={t('deposit.page.title')}
      />
      <ScrollView contentContainerClassName="gap-4 px-4 py-5 pb-12">
        {isLoading ? (
          // 方案 §8.1：hero 骨架屏，避免页面空白跳变
          <>
            <Skeleton className="h-44 rounded-3xl" />
            <Skeleton className="h-14" />
          </>
        ) : isError ? (
          // 方案 §8.1：错误卡片 + 重试，不伪装成未缴纳
          <View className="items-center gap-3 rounded-2xl border border-blush-border bg-danger-soft p-6">
            <Text className="text-sm font-bold text-status-danger-text">
              {t('deposit.status.loadFailed')}
            </Text>
            <Text className="text-xs text-on-surface-variant">{t('common.loadError.desc')}</Text>
            <Button
              accessibilityLabel={t('common.retry')}
              className="h-10 px-6"
              onPress={() => void refetch()}
            >
              <Text className="text-sm">{t('common.retry')}</Text>
            </Button>
          </View>
        ) : (
          <>
            {heroState === 'pending' ? (
              renderPendingHero()
            ) : (
              <View className={`rounded-3xl border p-5 ${visual.card}`}>
                <Text className="text-sm text-on-surface-variant">
                  {heroState === 'paid'
                    ? t('deposit.hero.paidLabel')
                    : t('deposit.hero.unpaidLabel')}
                </Text>
                <Text className={`mt-1 text-4xl font-extrabold ${visual.amount}`}>
                  {formatCurrency(depositAmount / 100, currency)}
                </Text>
                {renderLimitBox()}
                {heroState === 'paid' &&
                  (tiersQuery.isLoading ? (
                    <Skeleton className="mt-3 h-4 w-56 rounded-md" />
                  ) : (
                    nextTier && (
                      // 拍板 E：升级提示由 tiers 数据派生（E 拍板：不写死 i18n 文案）
                      <Text className="mt-3 text-xs leading-5 text-on-surface-variant">
                        {nextTier.maxOrderAmount === null
                          ? t('deposit.hint.topTier', {
                              amount: formatCurrency(nextTier.minAmount / 100, currency, {
                                decimals: 0,
                              }),
                            })
                          : t('deposit.hint.tier', {
                              amount: formatCurrency(nextTier.minAmount / 100, currency, {
                                decimals: 0,
                              }),
                              limit: formatCurrency(
                                (nextTier.maxOrderAmount ?? 0) / 100,
                                currency,
                                { decimals: 0 },
                              ),
                            })}
                      </Text>
                    )
                  ))}
              </View>
            )}

            {/* 已缴 + PENDING 并存（拍板 5）：绿 hero 展示当前余额/上限，banner 另起 */}
            {heroState === 'paid' && renderPendingHero()}

            {/* 未缴态：去缴纳入口（缴纳表单在子页 /pay，拍板 6） */}
            {heroState === 'unpaid' && (
              <Button accessibilityLabel={t('deposit.unpaid.cta')} onPress={() => goPay(5000)}>
                {t('deposit.unpaid.cta')}
              </Button>
            )}

            {/* 已缴态：追加缴纳主行动（拍板 4），档位预设 = 下一档；顶档回落 max($50, 余额) */}
            {heroState === 'paid' && (
              <Button
                accessibilityLabel={t('deposit.paid.addMore')}
                onPress={() => goPay(nextTier?.minAmount ?? Math.max(5000, depositAmount))}
              >
                {t('deposit.paid.addMore')}
              </Button>
            )}

            {/* 记录入口 —— 详情页仅此一个（拍板 4） */}
            <Button
              accessibilityLabel={t('deposit.records.title')}
              className="border border-outline bg-transparent"
              onPress={() => router.push('/settings/deposit/records')}
            >
              <Text className="text-sm font-semibold text-on-surface-variant">
                {t('deposit.records.entry')}
              </Text>
            </Button>

            {/* 页脚状态提示（方案 §9.1：live region，状态切换可被读屏感知） */}
            <View accessibilityLiveRegion="polite" className="items-center py-1">
              <Text className="text-xs text-on-surface-variant">
                {hasPending
                  ? t('deposit.footer.pending')
                  : heroState === 'paid'
                    ? t('deposit.footer.paid')
                    : t('deposit.footer.unpaid')}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** 行内重试链接（tier 缺失场景，方案 §3.2 拍板 8） */
function PressableRetry({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.retry')}
      className="h-6 w-6 items-center justify-center rounded-full active:bg-surface-container"
      onPress={onPress}
    >
      <AppIcon className="text-on-surface-variant" name="refresh" size={16} />
    </Pressable>
  );
}
