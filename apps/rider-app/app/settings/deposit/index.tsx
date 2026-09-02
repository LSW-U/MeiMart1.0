/**
 * 保证金缴纳页 — /settings/deposit（批 G，2026-09-03）
 *
 * HTML 原型 6.2 逐屏还原：
 *   - 未缴/PENDING/已缴三态 hero（红/橙/绿渐变卡 + 上限 box）
 *   - 双通道 Tab：线上（chips $1/$5/$10/$50/$100 + 自定义 + mock 支付即时生效）/
 *     线下 COD（缴纳点下拉 + 金额 + 说明 → PENDING）
 *   - PENDING 态：缴纳点 + 提交时间 + 「前往 XX 缴纳 $X」引导 banner
 *   - 已缴态：追加缴纳 + 查看记录入口
 *
 * 端点：POST /rider/deposit/requests | /:id/pay-mock；GET /rider/deposit/status（批 B）
 * 缴纳点下拉：GET /rider/deposit/locations 待后端（real 禁用 + 提示，见 useDepositLocations）
 */
import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { SimplePageHeader } from '@/src/components/layout/SimplePageHeader';
import { showToast } from '@/src/components/feedback/Toast';
import { colors } from '@/src/theme/colors';
import { useTranslation } from '@/src/i18n/useTranslation';
import { formatCurrency } from '@/src/utils/format';
import {
  useDepositStatus,
  useCreateDepositRequest,
  usePayMockDeposit,
  useDepositLocations,
  useDepositTiers,
} from '@/src/services/queries/useDeposit';

/** HTML 原型：档位预设 chips（分） */
const AMOUNT_CHIPS_CENTS = [100, 500, 1000, 5000, 10000];

type Channel = 'ONLINE_MOCK' | 'OFFLINE_COD';

export default function DepositPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const currency = t('common.currency');

  const { data: status, isLoading, refetch } = useDepositStatus();
  const createRequest = useCreateDepositRequest();
  const payMock = usePayMockDeposit();
  const locationsQuery = useDepositLocations();

  // 补端点批（2026-09-03）：REJECTED 重提预填（记录页携带原申请额，分 → chips/自定义联动）
  const params = useLocalSearchParams<{ resubmitAmount?: string }>();
  const initialAmount = useMemo(() => {
    const parsed = Number(params.resubmitAmount);
    return Number.isFinite(parsed) && parsed >= 100 ? parsed : 5000;
  }, [params.resubmitAmount]);

  const [channel, setChannel] = useState<Channel>('ONLINE_MOCK'); // 拍板 ③：默认线上
  const [amountCents, setAmountCents] = useState<number>(initialAmount);
  const [customAmount, setCustomAmount] = useState(
    AMOUNT_CHIPS_CENTS.includes(initialAmount) ? '' : (initialAmount / 100).toString(),
  );
  const [locationId, setLocationId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const locations = locationsQuery.data ?? [];

  // 补端点批（2026-09-03）：档位提示接真端点（/rider/deposit/tiers，enabled 过滤）
  const tiersQuery = useDepositTiers();

  /** 档位提示（HTML change-card 4：选 $X → 上限 $Y）——「缴纳到 $X 档需至少该额」取 ≥ 当前所选金额的最低档 */
  const tierHint = useMemo(() => {
    const tiers = tiersQuery.data ?? [];
    const target = [...tiers]
      .filter((tier) => tier.minAmount >= amountCents)
      .sort((a, b) => a.minAmount - b.minAmount)[0];
    if (!target) return null;
    const isTop = target.maxOrderAmount === null;
    return {
      min: target.minAmount,
      max: target.maxOrderAmount,
      isTop,
    };
  }, [tiersQuery.data, amountCents]);

  const pendingRequest = status?.recentRequests.find((r) => r.status === 'PENDING') ?? null;
  const depositAmount = status?.depositAmount ?? 0;
  const maxOrderAmount = status?.tier?.maxOrderAmount ?? null;

  /** 状态：PENDING 优先展示（引导去缴纳点），其次按余额 */
  const viewState: 'unpaid' | 'pending' | 'paid' =
    pendingRequest !== null ? 'pending' : depositAmount > 0 ? 'paid' : 'unpaid';

  async function handleOnlinePay() {
    try {
      // 两步（批 B 契约）：创建 ONLINE_MOCK PENDING → pay-mock 即时生效
      const record = await createRequest.mutateAsync({
        channel: 'ONLINE_MOCK',
        amount: amountCents,
      });
      await payMock.mutateAsync(record.id);
      showToast(t('deposit.pay.toastSuccess'), 'success');
      void refetch();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('deposit.pay.toastFailed'), 'error');
    }
  }

  async function handleCodSubmit() {
    if (!locationId) {
      showToast(t('deposit.cod.errorLocationRequired'), 'error');
      return;
    }
    try {
      await createRequest.mutateAsync({
        channel: 'OFFLINE_COD',
        amount: amountCents,
        locationId,
        note: note.trim() || undefined,
      });
      showToast(t('deposit.cod.toastSubmitted'), 'success');
      setNote('');
      void refetch();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('deposit.cod.toastFailed'), 'error');
    }
  }

  const submitting = createRequest.isPending || payMock.isPending;

  return (
    <View className="flex-1 bg-background">
      <SimplePageHeader backLabel={t('common.back')} title={t('deposit.page.title')} />
      <ScrollView contentContainerClassName="gap-4 px-4 py-5 pb-12">
        {/* ── 三态 hero（HTML deposit-hero：unpaid 红 / pending 橙 / paid 绿）── */}
        {isLoading ? null : viewState === 'pending' && pendingRequest ? (
          <View className="border-status-warning-bg bg-status-warning-bg rounded-3xl border p-5">
            <Text className="text-text-muted text-sm">{t('deposit.hero.pendingLabel')}</Text>
            <View className="mt-1 flex-row items-end justify-between">
              <Text className="text-warning text-4xl font-extrabold">
                {formatCurrency(pendingRequest.requestedAmount / 100, currency)}
              </Text>
              <View className="bg-status-warning-bg rounded-lg px-2.5 py-0.5">
                <Text className="text-status-warning-text text-xs font-bold">
                  {t('deposit.badge.pending')}
                </Text>
              </View>
            </View>
            <View className="mt-3 flex-row justify-between rounded-xl bg-white/60 px-3 py-2.5">
              <View>
                <Text className="text-text-muted text-xs">{t('deposit.hero.locationLabel')}</Text>
                <Text className="text-sm font-bold text-primary-container">
                  {locations.find((l) => l.id === pendingRequest.locationId)?.name ??
                    t('deposit.cod.locationFallback')}
                </Text>
              </View>
              <View>
                <Text className="text-text-muted text-xs">{t('deposit.hero.submittedAt')}</Text>
                <Text className="text-sm font-bold text-primary-container">
                  {new Date(pendingRequest.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View
            className={`rounded-3xl border p-5 ${
              viewState === 'paid'
                ? 'border-status-success-bg bg-status-success-bg'
                : 'border-status-danger-bg bg-status-danger-bg'
            }`}
          >
            <Text className="text-text-muted text-sm">
              {viewState === 'paid' ? t('deposit.hero.paidLabel') : t('deposit.hero.unpaidLabel')}
            </Text>
            <Text
              className={`mt-1 text-4xl font-extrabold ${
                viewState === 'paid' ? 'text-success' : 'text-danger'
              }`}
            >
              {formatCurrency(depositAmount / 100, currency)}
            </Text>
            <View className="mt-3 flex-row items-center justify-between rounded-xl bg-white/60 px-3 py-2.5">
              <View className="flex-1">
                <Text className="text-text-muted text-xs">{t('deposit.hero.limitLabel')}</Text>
                <Text className="text-xl font-bold text-primary-container">
                  {maxOrderAmount === null
                    ? t('deposit.hero.limitUnlimited')
                    : formatCurrency(maxOrderAmount / 100, currency)}
                </Text>
              </View>
              {viewState === 'paid' && (
                <View className="bg-status-success-bg rounded-lg px-2.5 py-1">
                  <Text className="text-status-success-text text-xs font-bold">
                    {t('deposit.badge.paid')}
                  </Text>
                </View>
              )}
            </View>
            {viewState === 'paid' && (
              <Text className="text-text-muted mt-3 text-xs leading-5">
                {t('deposit.hero.upgradeHint')}
              </Text>
            )}
          </View>
        )}

        {/* PENDING 引导 banner（HTML pending-banner） */}
        {viewState === 'pending' && pendingRequest && (
          <View className="border-status-warning-bg bg-status-warning-bg flex-row items-start gap-2 rounded-xl border px-3.5 py-2.5">
            <AppIcon
              accessibilityLabel={t('deposit.pending.bannerTitle')}
              color={colors.warnText}
              name="info"
              size={16}
            />
            <Text className="text-status-warning-text flex-1 text-xs leading-5">
              {t('deposit.pending.bannerText', {
                location: locations.find((l) => l.id === pendingRequest.locationId)?.name ?? '',
                amount: formatCurrency(pendingRequest.requestedAmount / 100, currency),
              })}
            </Text>
          </View>
        )}

        {/* 已缴态：记录入口 */}
        {viewState === 'paid' && (
          <Button
            accessibilityLabel={t('deposit.records.title')}
            className="border border-outline bg-transparent"
            onPress={() => router.push('/settings/deposit/records')}
          >
            <Text className="text-text-muted text-sm font-semibold">
              {t('deposit.records.entry')}
            </Text>
          </Button>
        )}

        {/* ── 双通道 Tab（HTML tab-bar；拍板 ③ 默认线上）── */}
        <View className="mt-1 flex-row gap-1 rounded-xl bg-surface-container-low p-1">
          {(['ONLINE_MOCK', 'OFFLINE_COD'] as const).map((c) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: channel === c }}
              className={`flex-1 items-center rounded-lg py-2 ${channel === c ? 'bg-surface shadow-sm' : ''}`}
              key={c}
              onPress={() => setChannel(c)}
            >
              <Text
                className={`text-sm font-semibold ${channel === c ? 'text-primary' : 'text-text-muted'}`}
              >
                {c === 'ONLINE_MOCK' ? t('deposit.tab.online') : t('deposit.tab.cod')}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── 表单卡 ── */}
        <View className="border-border gap-4 rounded-2xl border bg-surface p-4">
          {/* 金额 chips（HTML amount-chips，拍板 ④ 双轨） */}
          <View className="gap-2">
            <Text className="text-text-muted text-xs font-bold">
              {t('deposit.form.amountLabel')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {AMOUNT_CHIPS_CENTS.map((cents) => {
                const selected = amountCents === cents;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={`rounded-xl border-2 px-4 py-2 ${selected ? 'bg-primary-soft border-primary' : 'border-border'}`}
                    key={cents}
                    onPress={() => {
                      setAmountCents(cents);
                      setCustomAmount('');
                    }}
                  >
                    <Text
                      className={`text-sm font-bold ${selected ? 'text-primary' : 'text-text-muted'}`}
                    >
                      {formatCurrency(cents / 100, currency, { decimals: 0 })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {/* 自定义金额（分↔元显式换算） */}
            <TextInput
              accessibilityLabel={t('deposit.form.customAmountLabel')}
              className="border-border rounded-xl border-[1.5px] px-3 py-3 text-base font-semibold text-on-surface"
              keyboardType="numeric"
              placeholder={t('deposit.form.customAmountPlaceholder')}
              value={customAmount}
              onChangeText={(text) => {
                setCustomAmount(text);
                const dollar = Number(text);
                if (Number.isFinite(dollar) && dollar >= 1) {
                  setAmountCents(Math.round(dollar * 100));
                }
              }}
            />
          </View>

          {/* 档位提示（HTML tier-hint） */}
          {tierHint && (
            <Text className="text-text-muted rounded-lg bg-surface-container-low px-2.5 py-2 text-xs leading-5">
              {tierHint.isTop
                ? t('deposit.hint.topTier', {
                    amount: formatCurrency(tierHint.min / 100, currency, { decimals: 0 }),
                  })
                : t('deposit.hint.tier', {
                    amount: formatCurrency(tierHint.min / 100, currency, { decimals: 0 }),
                    limit: formatCurrency((tierHint.max ?? 0) / 100, currency, { decimals: 0 }),
                  })}
            </Text>
          )}

          {/* 线下 COD 专属：缴纳点下拉 + 说明 */}
          {channel === 'OFFLINE_COD' && (
            <>
              <View className="gap-2">
                <Text className="text-text-muted text-xs font-bold">
                  {t('deposit.form.locationLabel')}
                </Text>
                {locationsQuery.isError ? (
                  <Text className="border-border text-text-muted rounded-xl border-[1.5px] px-3 py-3 text-sm">
                    {t('deposit.cod.locationsLoadFailed')}
                  </Text>
                ) : (
                  <View className="gap-1.5">
                    {locations.map((loc) => {
                      const selected = locationId === loc.id;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          className={`rounded-xl border-[1.5px] px-3 py-2.5 ${selected ? 'bg-primary-soft border-primary' : 'border-border'}`}
                          key={loc.id}
                          onPress={() => setLocationId(loc.id)}
                        >
                          <Text
                            className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-on-surface'}`}
                          >
                            {loc.name}
                          </Text>
                          <Text className="text-text-muted mt-0.5 text-xs">{loc.address}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
              <View className="gap-2">
                <Text className="text-text-muted text-xs font-bold">
                  {t('deposit.form.noteLabel')}
                </Text>
                <TextInput
                  accessibilityLabel={t('deposit.form.noteLabel')}
                  className="border-border min-h-[60px] rounded-xl border-[1.5px] px-3 py-3 text-sm text-on-surface"
                  multiline
                  placeholder={t('deposit.form.notePlaceholder')}
                  value={note}
                  onChangeText={setNote}
                />
              </View>
              <Text className="bg-status-warning-bg text-status-warning-text rounded-lg px-2.5 py-2 text-xs leading-5">
                {t('deposit.cod.pendingWarning')}
              </Text>
            </>
          )}

          {/* 支付方式说明（线上） */}
          {channel === 'ONLINE_MOCK' && (
            <View className="border-border flex-row items-center justify-between rounded-xl border-[1.5px] px-3 py-3">
              <Text className="text-sm text-on-surface">{t('deposit.pay.methodLabel')}</Text>
              <Text className="text-success text-xs font-bold">
                {t('deposit.pay.instantLabel')}
              </Text>
            </View>
          )}

          {/* 提交按钮 */}
          <Button
            accessibilityLabel={
              channel === 'ONLINE_MOCK'
                ? t('deposit.pay.button', { amount: formatCurrency(amountCents / 100, currency) })
                : t('deposit.cod.submitButton')
            }
            className="bg-primary-container"
            disabled={submitting}
            onPress={() =>
              channel === 'ONLINE_MOCK' ? void handleOnlinePay() : void handleCodSubmit()
            }
          >
            <Text className="text-base font-bold text-white">
              {submitting
                ? t('duty.loading')
                : channel === 'ONLINE_MOCK'
                  ? t('deposit.pay.button', { amount: formatCurrency(amountCents / 100, currency) })
                  : t('deposit.cod.submitButton')}
            </Text>
          </Button>
        </View>

        {/* 全部记录入口（未缴/PENDING 态也可见，HTML「查看申请记录 ›」） */}
        <Button
          accessibilityLabel={t('deposit.records.title')}
          className="border border-outline bg-transparent"
          onPress={() => router.push('/settings/deposit/records')}
        >
          <Text className="text-text-muted text-sm font-semibold">
            {t('deposit.records.entry')}
          </Text>
        </Button>
      </ScrollView>
    </View>
  );
}
