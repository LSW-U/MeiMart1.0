import { Text, View } from 'react-native';

import { AppIcon, Button } from '../ui';
import { useTranslation } from '../../i18n/useTranslation';
import { colors } from '../../theme/colors';

type DepositBlockDialogProps = {
  visible: boolean;
  /**
   * unpaid=未缴（主 CTA 缴款页）/ pending=已提交待确认（CTA 查看申请）
   * P3-1（审查 20260911）：tierLimit=已缴但本单金额超档位上限（E-DEPOSIT-202，
   * 结构复用 unpaid 同款 CTA，文案换「当前档位上限不足」——已缴骑手看「需要缴纳
   * 保证金」标题语义矛盾）
   */
  reason: 'unpaid' | 'tierLimit' | 'pending';
  /** pending 分支的已提交金额（调用方 formatCurrency 后传，如 "$5.00"） */
  pendingAmount?: string;
  /** unpaid 分支主 CTA——批B 改跳 /settings/deposit/pay 缴款页（原 settings 首页） */
  onGoDeposit: () => void;
  /** pending 分支 CTA——跳 /settings/deposit/records（unpaid 分支不渲染） */
  onViewRequest?: () => void;
  /** 「稍后/知道了」关闭（tasks 页 dismiss 后本会话不再弹） */
  onDismiss: () => void;
};

/**
 * 保证金拦截弹窗（批B B1 从 tasks.tsx 抽公共，供 task/[id].tsx B2 复用）
 *
 * 两分支（HTML 6.3 三态中的两态；'none' 不弹由调用方 visible 控制）：
 *   - unpaid：未缴保证金——主 CTA「前往缴纳」跳缴款页（批B 改 /settings/deposit/pay）
 *   - tierLimit：已缴但本单金额超档位上限（P3-1）——同结构换档位上限文案，CTA 同跳缴款页
 *   - pending：已提交 $X 等 admin 确认——CTA「查看申请」跳记录页
 *
 * 接单失败 E-DEPOSIT-201/202（B2）按 code 分流 unpaid/tierLimit（P3-1），替代原 networkError toast。
 * 样式还原 tasks.tsx 原内联实现（绝对定位遮罩 + 280px 卡片），不做视觉改动。
 */
export function DepositBlockDialog({
  visible,
  reason,
  pendingAmount,
  onGoDeposit,
  onViewRequest,
  onDismiss,
}: DepositBlockDialogProps) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <View className="absolute inset-0 items-center justify-center bg-black/50 px-8">
      <View className="w-full max-w-[280px] gap-4 rounded-3xl bg-surface p-6 shadow-xl">
        {reason === 'unpaid' || reason === 'tierLimit' ? (
          // 三态①未缴（HTML：直跳缴纳页，非 settings；明示 ≥$1 可接单）
          // P3-1 tierLimit：已缴但本单金额超档位上限——同结构换标题/正文，CTA 语义不变
          <>
            <View className="mx-auto h-14 w-14 items-center justify-center rounded-full bg-status-danger-bg">
              <AppIcon
                accessibilityLabel={t(
                  reason === 'tierLimit' ? 'tasks.deposit.tierLimitTitle' : 'tasks.deposit.title',
                )}
                color={colors.danger}
                name="deposit"
                size={28}
              />
            </View>
            <Text className="text-center text-lg font-bold text-on-surface">
              {t(reason === 'tierLimit' ? 'tasks.deposit.tierLimitTitle' : 'tasks.deposit.title')}
            </Text>
            <Text className="text-center text-sm leading-6 text-on-surface-variant">
              {reason === 'tierLimit'
                ? t('tasks.deposit.tierLimitMessage', { amount: pendingAmount ?? '' })
                : t('tasks.deposit.messageV2')}
            </Text>
            <Button className="bg-primary-container" onPress={onGoDeposit}>
              {t('tasks.deposit.goDeposit')}
            </Button>
            <Button className="border border-outline bg-transparent" onPress={onDismiss}>
              {t('tasks.deposit.later')}
            </Button>
          </>
        ) : (
          // 三态②PENDING（HTML：已提交 $X 等待 admin 确认）
          <>
            <View className="bg-status-warning-bg mx-auto h-14 w-14 items-center justify-center rounded-full">
              <AppIcon
                accessibilityLabel={t('tasks.deposit.pendingTitle')}
                color={colors.warning}
                name="clock"
                size={28}
              />
            </View>
            <Text className="text-center text-lg font-bold text-on-surface">
              {t('tasks.deposit.pendingTitle')}
            </Text>
            <Text className="text-center text-sm leading-6 text-on-surface-variant">
              {t('tasks.deposit.pendingMessage', { amount: pendingAmount ?? '' })}
            </Text>
            {onViewRequest ? (
              <Button className="border-warning border bg-transparent" onPress={onViewRequest}>
                {t('tasks.deposit.viewRequest')}
              </Button>
            ) : null}
            <Button className="border border-outline bg-transparent" onPress={onDismiss}>
              {t('tasks.deposit.gotIt')}
            </Button>
          </>
        )}
      </View>
    </View>
  );
}
