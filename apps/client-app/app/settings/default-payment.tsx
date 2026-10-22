// DefaultPaymentPage — 默认支付方式选择页（方案B 2026-10-22，⚠️ 无 HTML 原型，
// 视觉参照语言页 language.tsx 单选卡形态推导实现，待设计确认）
// 骨架复用 language.tsx：SafeAreaWrapper + PrimaryHeader + 卡列表 + 实心圆白勾选中态；
// 交互同款：点已选项静默返回（审查 F4 语义），点新项写偏好 → toast → 500ms 后返回
// 数据：写路径 changeDefaultPayment（paymentPreference 共享，settings 行同源）
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Icon } from '@/components/ui/Icon';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { toApiErrorText } from '@/utils/apiError';
import { localize, type AppLocale } from '@/i18n';
import { usePaymentMethods } from '@/services/queries/usePayment';
import { useProfile, useUpdateProfile } from '@/services/queries/useUser';
import { getDefaultPaymentMethod, changeDefaultPayment } from '@/services/paymentPreference';
import { useEffect, useState } from 'react';

// 选项统一形态：code null = 自动（未设置，结算页走后端偏好>本地缓存>默认 COD 回退链）
interface PayOption {
  code: string | null;
  label: string;
  subtitle?: string;
}

export default function DefaultPaymentPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const locale = useAppStore((s) => s.locale);
  // 未登录直接返回（偏好是登录态能力，与 settings 行同门控；push 入口已门控，此处兜底）
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: paymentMethods } = usePaymentMethods();
  const payableMethods = (paymentMethods ?? []).filter((m) => m.available !== false);
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [defaultPay, setDefaultPay] = useState<string | null>(null);

  // 读链与 settings 行同源（后端偏好 > 本地缓存离线降级）；react-hooks/set-state-in-effect
  // 豁免理由同 settings.tsx：异步外部数据源到达后落定派生 state 属官方「派生 state 重置」形态
  const profilePayCode = profile?.defaultPaymentMethod ?? null;
  const profileLoaded = profile !== undefined;
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 上述豁免原因
    if (profileLoaded) setDefaultPay(profilePayCode);
    getDefaultPaymentMethod()
      .then((v) => {
        // prev ?? v：profile 有值时 prev 已落定不覆盖；profile null/未加载才落到本地缓存
        if (!cancelled) setDefaultPay((prev) => prev ?? v);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profilePayCode, profileLoaded]);

  // 选项表：自动（null）首项 + 全量可用渠道（解 slice(0,2) 截断）
  const options: PayOption[] = [
    { code: null, label: t('settings.defaultPayAuto') },
    ...payableMethods.map((m) => ({
      code: m.code ?? m.id.toUpperCase(),
      label: localize(m.name, locale as AppLocale),
      subtitle: m.subtitle ? localize(m.subtitle, locale as AppLocale) : undefined,
    })),
  ];

  // 语言页 select 同款：同项静默返回；新项写偏好（乐观 state + 共享 changeDefaultPayment）
  // → toast → 500ms 延迟返回让用户看到 toast
  const select = (code: string | null) => {
    if (defaultPay === code) return;
    setDefaultPay(code);
    changeDefaultPayment(code, { mutate: updateProfile.mutate }, (err) =>
      toast.error(toApiErrorText(err, t)),
    );
    toast.success(t('settings.defaultPaySaved'));
    setTimeout(handleBack, 500);
  };

  // 未登录不渲染列表（兜底；正常路径 settings 行已门控）
  if (!isAuthenticated) {
    return (
      <SafeAreaWrapper
        edges={['top', 'bottom']}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <StatusBarConfig />
        <PrimaryHeader
          title={t('settings.defaultPaymentMethod')}
          showBack
          onBackPress={handleBack}
          testID="default-payment-back"
        />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('settings.defaultPaymentMethod')}
        showBack
        onBackPress={handleBack}
        testID="default-payment-back"
      />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {options.map((opt) => {
          const active = defaultPay === opt.code;
          return (
            <Pressable
              key={opt.code ?? 'auto'}
              testID={`default-payment-option-${opt.code ?? 'auto'}`}
              onPress={() => select(opt.code)}
              style={({ pressed }) => [
                styles.payCard,
                {
                  backgroundColor: active
                    ? colors['surface-container-high']
                    : colors['surface-container-lowest'],
                  borderColor: active ? colors.primary : 'transparent',
                },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: active }}
            >
              <View style={styles.payText}>
                <Text
                  style={[
                    styles.payName,
                    { color: active ? colors.primary : colors['on-surface'] },
                  ]}
                >
                  {opt.label}
                </Text>
                {opt.subtitle && (
                  <Text style={[styles.paySubtitle, { color: colors['on-surface-variant'] }]}>
                    {opt.subtitle}
                  </Text>
                )}
              </View>
              {/* 选中态：primary 实心圆 + 白 check（语言页 D3 同款） */}
              {active && (
                <View style={[styles.payCheck, { backgroundColor: colors.primary }]}>
                  <Icon symbol="check" size={14} color={colors['on-primary']} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.md, gap: spacing.sm },
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.md,
    minHeight: 60,
    borderWidth: 1.5,
  },
  payText: { flex: 1 },
  payName: { ...typography['body-md'], fontSize: 16, fontWeight: '600' },
  paySubtitle: { ...typography['body-sm'], marginTop: 2 },
  payCheck: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
