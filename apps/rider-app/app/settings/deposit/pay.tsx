/**
 * 保证金缴纳子页 — /settings/deposit/pay（批 H 拍板 6：详情/缴纳拆分，2026-09-03 方案）
 *
 * HTML 原型「缴纳保证金」screen 还原：
 *   - 双通道 Tab + 动态 summary（线上「即时生效」/ 线下「需 admin 确认」，拍板 7）
 *   - 金额 chips $1/$5/$10/$50/$100 + 自定义输入双轨（§6.1：inline error + 预览框 +
 *     accessibilityValue；< $1 或非法输入禁用提交，amountCents 不保留旧值）
 *   - 档位提示由 /rider/deposit/tiers 派生（loading skeleton / error+重试）
 *   - 线下 COD：缴纳点 radio 卡片（loading/error/empty 三态）+ COD warning + 流程提示
 *   - 线上：mock 支付两步（createRequest → pay-mock 即时生效）+ 页脚提示
 *
 * 入口参数（分）：
 *   - presetAmount：详情页「追加缴纳」档位预设
 *   - resubmitAmount：记录页 REJECTED 重新提交预填
 * 返回语义：「‹ 保证金」（拍板 7；SimplePageHeader fallback 回详情页）
 *
 * 端点：POST /rider/deposit/requests | /:id/pay-mock；GET /locations | /tiers
 */
import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui';
import { AppIcon } from '@/src/components/ui/AppIcon';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { SimplePageHeader } from '@/src/components/layout/SimplePageHeader';
import { showToast } from '@/src/components/feedback/Toast';
import { useTranslation } from '@/src/i18n/useTranslation';
import { formatCurrency } from '@/src/utils/format';
import {
  useDepositTiers,
  useCreateDepositRequest,
  usePayMockDeposit,
  useDepositLocations,
} from '@/src/services/queries/useDeposit';

/** HTML 原型：档位预设 chips（分） */
const AMOUNT_CHIPS_CENTS = [100, 500, 1000, 5000, 10000];

type Channel = 'ONLINE_MOCK' | 'OFFLINE_COD';

export default function DepositPayPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const currency = t('common.currency');

  const createRequest = useCreateDepositRequest();
  const payMock = usePayMockDeposit();
  const locationsQuery = useDepositLocations();
  const tiersQuery = useDepositTiers();
  const locations = locationsQuery.data ?? [];

  // 追加缴纳档位预设 / REJECTED 重提预填（分 → chips/自定义联动）
  const params = useLocalSearchParams<{ presetAmount?: string; resubmitAmount?: string }>();
  const initialAmount = useMemo(() => {
    const parsed = Number(params.presetAmount ?? params.resubmitAmount);
    return Number.isFinite(parsed) && parsed >= 100 ? parsed : 5000;
  }, [params.presetAmount, params.resubmitAmount]);

  const [channel, setChannel] = useState<Channel>('ONLINE_MOCK'); // 默认线上（批 G 拍板 ③）
  // 预填额（chip 或自定义）≥ $1 已由 initialAmount 校验，初始即为有效金额；
  // 之后自定义输入非法时置 null（不保留旧值，§6.1）
  const [amountCents, setAmountCents] = useState<number | null>(initialAmount);
  const [customAmount, setCustomAmount] = useState(
    AMOUNT_CHIPS_CENTS.includes(initialAmount) ? '' : (initialAmount / 100).toString(),
  );
  const [amountError, setAmountError] = useState<'invalid' | 'min' | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  /** §6.1：自定义金额只允许数字 + 最多两位小数；< $1 / 非法 → error，不保留旧金额 */
  function handleCustomAmount(text: string) {
    setCustomAmount(text);
    if (text.trim() === '') {
      // 清空输入回落到无选中态（chips 未选中、提交禁用），不保留上一个有效金额
      setAmountCents(null);
      setAmountError(null);
      return;
    }
    if (!/^\d{1,6}(\.\d{0,2})?$/.test(text)) {
      setAmountCents(null);
      setAmountError('invalid');
      return;
    }
    const cents = Math.round(Number(text) * 100);
    if (cents < 100) {
      setAmountCents(null);
      setAmountError('min');
      return;
    }
    setAmountCents(cents);
    setAmountError(null);
  }

  /** 档位提示（HTML tier-hint）：「缴纳到 $X 档需至少该额」取 ≥ 当前所选金额的最低档 */
  const tierHint = useMemo(() => {
    if (amountCents === null) return null;
    const tiers = tiersQuery.data ?? [];
    const target = [...tiers]
      .filter((tier) => tier.minAmount >= amountCents)
      .sort((a, b) => a.minAmount - b.minAmount)[0];
    if (!target) return null;
    return {
      min: target.minAmount,
      max: target.maxOrderAmount,
      isTop: target.maxOrderAmount === null,
    };
  }, [tiersQuery.data, amountCents]);

  async function handleOnlinePay() {
    if (amountCents === null) return;
    try {
      // 两步（批 B 契约）：创建 ONLINE_MOCK PENDING → pay-mock 即时生效
      const record = await createRequest.mutateAsync({
        channel: 'ONLINE_MOCK',
        amount: amountCents,
      });
      await payMock.mutateAsync(record.id);
      showToast(t('deposit.pay.toastSuccess'), 'success');
      router.back();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('deposit.pay.toastFailed'), 'error');
    }
  }

  async function handleCodSubmit() {
    if (amountCents === null) {
      showToast(t('deposit.form.amountInvalid'), 'error');
      return;
    }
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
      router.back();
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('deposit.cod.toastFailed'), 'error');
    }
  }

  const submitting = createRequest.isPending || payMock.isPending;
  const amountInvalid = amountCents === null;

  return (
    <View className="flex-1 bg-background">
      <SimplePageHeader
        backLabel={t('deposit.pay.backToDeposit')}
        fallbackHref="/settings/deposit"
        title={t('deposit.pay.title')}
      />
      <ScrollView contentContainerClassName="gap-4 px-4 py-5 pb-12">
        {/* ── 双通道 Tab（HTML tab-bar）── */}
        <View className="flex-row gap-1 rounded-xl bg-surface-container-low p-1">
          {(['ONLINE_MOCK', 'OFFLINE_COD'] as const).map((c) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: channel === c }}
              className={`flex-1 items-center rounded-lg py-2 ${channel === c ? 'bg-surface shadow-sm' : ''}`}
              key={c}
              onPress={() => setChannel(c)}
            >
              <Text
                className={`text-sm font-semibold ${channel === c ? 'text-primary' : 'text-on-surface-variant'}`}
              >
                {c === 'ONLINE_MOCK' ? t('deposit.tab.online') : t('deposit.tab.cod')}
              </Text>
            </Pressable>
          ))}
        </View>
        {/* Tab summary（拍板 7：线上「即时生效」/ 线下「需 admin 确认」） */}
        <Text
          accessibilityLiveRegion="polite"
          className="-mt-2 text-center text-xs text-on-surface-variant"
        >
          {channel === 'ONLINE_MOCK'
            ? t('deposit.pay.subtitleOnline')
            : t('deposit.pay.subtitleCod')}
        </Text>

        {/* ── 表单卡 ── */}
        <View className="gap-4 rounded-2xl border border-surface-variant bg-surface p-4">
          {/* 金额 chips（HTML amount-chips，双轨） */}
          <View className="gap-2">
            <Text className="text-xs font-bold text-on-surface-variant">
              {t('deposit.form.amountLabel')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {AMOUNT_CHIPS_CENTS.map((cents) => {
                const selected = amountCents === cents;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('deposit.pay.chipA11y', {
                      amount: formatCurrency(cents / 100, currency, { decimals: 0 }),
                    })}
                    accessibilityState={{ selected }}
                    className={`rounded-xl border-2 px-4 py-2 ${selected ? 'border-primary bg-surface-container' : 'border-surface-variant'}`}
                    key={cents}
                    onPress={() => {
                      setAmountCents(cents);
                      setCustomAmount('');
                      setAmountError(null);
                    }}
                  >
                    <Text
                      className={`text-sm font-bold ${selected ? 'text-primary' : 'text-on-surface-variant'}`}
                    >
                      {formatCurrency(cents / 100, currency, { decimals: 0 })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {/* 当前缴纳金额预览框（方案 §6.1 建议 2） */}
            <View className="flex-row items-center justify-between rounded-xl bg-surface-container-low px-3 py-2.5">
              <Text className="text-xs font-bold text-on-surface-variant">
                {t('deposit.form.amountPreviewLabel')}
              </Text>
              <Text
                className={`text-base font-extrabold ${amountInvalid ? 'text-on-surface-variant' : 'text-primary-container'}`}
              >
                {amountCents === null ? '—' : formatCurrency(amountCents / 100, currency)}
              </Text>
            </View>
            {/* 自定义金额（分↔元显式换算；inline error + accessibilityValue） */}
            <TextInput
              accessibilityLabel={t('deposit.form.customAmountLabel')}
              accessibilityValue={
                amountCents === null
                  ? { text: '' }
                  : { text: formatCurrency(amountCents / 100, currency) }
              }
              className={`rounded-xl border-[1.5px] px-3 py-3 text-base font-semibold text-on-surface ${
                amountError ? 'border-status-danger-text' : 'border-surface-variant'
              }`}
              keyboardType="numeric"
              placeholder={t('deposit.form.customAmountPlaceholder')}
              value={customAmount}
              onChangeText={handleCustomAmount}
            />
            {amountError && (
              <Text className="text-xs text-status-danger-text">
                {amountError === 'min'
                  ? t('deposit.form.amountMinError', {
                      amount: formatCurrency(1, currency, { decimals: 0 }),
                    })
                  : t('deposit.form.amountInvalid')}
              </Text>
            )}
          </View>

          {/* 档位提示（HTML tier-hint；loading skeleton / error + 重试，方案 §6.2） */}
          {tiersQuery.isLoading ? (
            <Skeleton className="h-8 rounded-lg" />
          ) : tiersQuery.isError ? (
            <View className="flex-row items-center justify-between rounded-lg bg-surface-container-low px-2.5 py-2">
              <Text className="text-xs text-on-surface-variant">
                {t('deposit.tiers.loadFailed')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.retry')}
                className="px-2 py-1"
                onPress={() => void tiersQuery.refetch()}
              >
                <Text className="text-xs font-bold text-primary">{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : (
            tierHint && (
              <Text className="rounded-lg bg-surface-container-low px-2.5 py-2 text-xs leading-5 text-on-surface-variant">
                {tierHint.isTop
                  ? t('deposit.hint.topTier', {
                      amount: formatCurrency(tierHint.min / 100, currency, { decimals: 0 }),
                    })
                  : t('deposit.hint.tier', {
                      amount: formatCurrency(tierHint.min / 100, currency, { decimals: 0 }),
                      limit: formatCurrency((tierHint.max ?? 0) / 100, currency, {
                        decimals: 0,
                      }),
                    })}
              </Text>
            )
          )}

          {/* 线下 COD 专属：缴纳点 radio 卡片 + 说明（方案 §6.4 备选 B） */}
          {channel === 'OFFLINE_COD' && (
            <>
              <View className="gap-2">
                <Text className="text-xs font-bold text-on-surface-variant">
                  {t('deposit.form.locationLabel')}
                </Text>
                {locationsQuery.isLoading ? (
                  // 方案 §8.2：1-2 条缴纳点 skeleton
                  <>
                    <Skeleton className="h-14 rounded-xl" />
                    <Skeleton className="h-14 rounded-xl" />
                  </>
                ) : locationsQuery.isError ? (
                  // 方案 §8.2：错误文案 + 重试
                  <View className="flex-row items-center justify-between rounded-xl border-[1.5px] border-surface-variant px-3 py-3">
                    <Text className="text-sm text-on-surface-variant">
                      {t('deposit.cod.locationsLoadFailed')}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('common.retry')}
                      className="px-2 py-1"
                      onPress={() => void locationsQuery.refetch()}
                    >
                      <Text className="text-xs font-bold text-primary">{t('common.retry')}</Text>
                    </Pressable>
                  </View>
                ) : locations.length === 0 ? (
                  // 方案 §8.2：空列表态
                  <Text className="rounded-xl border-[1.5px] border-surface-variant px-3 py-3 text-sm text-on-surface-variant">
                    {t('deposit.cod.locationsEmpty')}
                  </Text>
                ) : (
                  <View className="gap-1.5">
                    {locations.map((loc) => {
                      const selected = locationId === loc.id;
                      return (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityLabel={`${loc.name} — ${loc.address}`}
                          accessibilityState={{ checked: selected }}
                          className={`flex-row items-center justify-between rounded-xl border-[1.5px] px-3 py-2.5 ${selected ? 'border-primary bg-surface-container' : 'border-surface-variant'}`}
                          key={loc.id}
                          onPress={() => setLocationId(loc.id)}
                        >
                          <View className="flex-1">
                            <Text
                              className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-on-surface'}`}
                            >
                              {loc.name}
                            </Text>
                            <Text className="mt-0.5 text-xs text-on-surface-variant">
                              {loc.address}
                            </Text>
                          </View>
                          {/* 选中 check icon（radio 语义视觉，方案 §6.4 备选 B） */}
                          {selected && (
                            <AppIcon
                              accessibilityLabel={loc.name}
                              className="text-primary"
                              name="check"
                              size={18}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
              <View className="gap-2">
                <Text className="text-xs font-bold text-on-surface-variant">
                  {t('deposit.form.noteLabel')}
                </Text>
                <TextInput
                  accessibilityLabel={t('deposit.form.noteLabel')}
                  className="min-h-[60px] rounded-xl border-[1.5px] border-surface-variant px-3 py-3 text-sm text-on-surface"
                  multiline
                  placeholder={t('deposit.form.notePlaceholder')}
                  value={note}
                  onChangeText={setNote}
                />
              </View>
              {/* COD warning + 流程提示（token 按方案 §6.4：warn-bg / warn-text） */}
              <Text className="rounded-lg bg-warn-bg px-2.5 py-2 text-xs leading-5 text-warn-text">
                {t('deposit.cod.pendingWarning')}
              </Text>
              <Text className="text-center text-xs text-on-surface-variant">
                {t('deposit.cod.flowHint')}
              </Text>
            </>
          )}

          {/* 支付方式说明（线上） */}
          {channel === 'ONLINE_MOCK' && (
            <View className="flex-row items-center justify-between rounded-xl border-[1.5px] border-surface-variant px-3 py-3">
              <Text className="text-sm text-on-surface">{t('deposit.pay.methodLabel')}</Text>
              <Text className="text-xs font-bold text-status-done-text">
                {t('deposit.pay.instantLabel')}
              </Text>
            </View>
          )}

          {/* 提交按钮（方案 §7：金额无效禁用；COD 保留可点触发校验 toast） */}
          <Button
            accessibilityLabel={
              channel === 'ONLINE_MOCK' && amountCents !== null
                ? t('deposit.pay.button', { amount: formatCurrency(amountCents / 100, currency) })
                : channel === 'ONLINE_MOCK'
                  ? t('deposit.pay.confirm')
                  : t('deposit.cod.submitButton')
            }
            className="bg-primary-container"
            disabled={channel === 'ONLINE_MOCK' && (amountInvalid || submitting)}
            loading={submitting}
            onPress={() =>
              channel === 'ONLINE_MOCK' ? void handleOnlinePay() : void handleCodSubmit()
            }
          >
            {channel === 'ONLINE_MOCK' && amountCents !== null
              ? t('deposit.pay.button', { amount: formatCurrency(amountCents / 100, currency) })
              : channel === 'ONLINE_MOCK'
                ? t('deposit.pay.confirm')
                : t('deposit.cod.submitButton')}
          </Button>

          {/* 页脚提示（线上：支付成功即时提升上限，方案 §6.3 建议） */}
          {channel === 'ONLINE_MOCK' && (
            <Text className="text-center text-xs text-on-surface-variant">
              {t('deposit.pay.footerHint')}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
