// CheckoutAddressModal — checkout 页内快速新增地址（业务增强批1 5.5，方案v2 2026-11-05）
//
// 形态（grill-me 拍板）：Modal 内嵌简化表单——姓名/电话/详情三字段 + content_paste 智能识别
//   入口（复用 src/utils/addressParse.ts parseAddressText，与 app/address/list.tsx 同款）。
//   省略省/市/区与地图选点（下单链路求快）：后端 CreateAddressRequest 的 region 必填
//   （user.controller.ts:135，province/city），保存时以帝力常量兜底（'Dili'，address service
//   DILI_* 同口径）；lat/lng 缺省由后端存 null。
//   ⚠️ 已知限制（遗留登记）：下单时 order.service.ts:254 校验地址 lat/lng 非空（E-ORDER-001）
//   ——新建地址未选地图点选中后也无法直接下单，checkout 下单链路已有错误提示引导去 edit 页
//   补坐标，本 Modal 不伪装「已定位」，仅登记该限制。
// 提交：react-hook-form + zod（CLAUDE.md 规则）；保存复用 useCreateAddress onMutate 三件套
//   （乐观写入地址列表，规则 26），成功后 useAddressSelectionStore.select 自动选中 → 关 Modal
//   留在 checkout，不离开下单链路。
import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/forms/FormInput';
import { useCreateAddress } from '@/services/queries/useAddress';
import { useAddressSelectionStore } from '@/store/addressSelectionStore';
import { parseAddressText } from '@/utils/addressParse';
import { toast } from '@/store/toastStore';

// 简化表单校验：三字段非空 + 电话格式（与 src/forms/schemas/user.ts phoneSchema 同 regex）
const checkoutAddressSchema = z.object({
  recipientName: z.string().min(1, 'checkout.addressModal.nameRequired').max(40),
  phone: z
    .string()
    .min(1, 'checkout.addressModal.phoneRequired')
    .regex(/^(\+?670|0)?\s?\d{7,12}$/, 'checkout.addressModal.phoneInvalid'),
  detail: z.string().min(1, 'checkout.addressModal.detailRequired').max(120),
});

type CheckoutAddressValues = z.infer<typeof checkoutAddressSchema>;

// region 兜底（后端 CreateAddressRequest region.province/city 必填，user.controller.ts:135）：
// checkout 快速新增不做地图选点，帝力为默认服务城市（address service DILI_* 常量同口径）。
// Address 前端类型是平铺 province/city/district 字段（service 层 toAddressPayload 负责转嵌套 region）
const DEFAULT_REGION = { province: 'Dili', city: 'Dili' };

interface CheckoutAddressModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CheckoutAddressModal({ visible, onClose }: CheckoutAddressModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const createAddress = useCreateAddress();
  const selectAddress = useAddressSelectionStore((s) => s.select);
  // P16 决策 9 同款：智能识别粘贴文本 → parseAddressText 拆姓名/电话/详情
  const [smartVisible, setSmartVisible] = useState(false);
  const [smartText, setSmartText] = useState('');

  const { control, handleSubmit, reset, setValue } = useForm<CheckoutAddressValues>({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: { recipientName: '', phone: '', detail: '' },
    mode: 'onBlur',
  });

  const handleClose = () => {
    setSmartVisible(false);
    setSmartText('');
    reset();
    onClose();
  };

  const handleSmartParse = () => {
    const parsed = parseAddressText(smartText);
    if (!parsed.phone && !parsed.name) {
      toast.error(t('checkout.addressModal.parseFailed'));
      return;
    }
    if (parsed.name) setValue('recipientName', parsed.name, { shouldValidate: true });
    if (parsed.phone) setValue('phone', parsed.phone, { shouldValidate: true });
    if (parsed.detail) setValue('detail', parsed.detail, { shouldValidate: true });
    setSmartVisible(false);
    setSmartText('');
  };

  const onSubmit = (values: CheckoutAddressValues) => {
    createAddress.mutate(
      {
        name: values.recipientName,
        phone: values.phone,
        // 后端 CreateAddressRequest region 必填（province/city）——checkout 快速新增不做
        // 地图选点，以帝力常量兜底（DEFAULT_REGION 注释）；district 可选省略
        province: DEFAULT_REGION.province,
        city: DEFAULT_REGION.city,
        // 简化表单不拆 district，空串与后端 district 可选语义一致（service 层空串不传嵌套 district）
        district: '',
        detail: values.detail,
        isDefault: false,
      },
      {
        onSuccess: (created) => {
          // 自动选中新地址（本次结算会话），关 Modal 留在 checkout
          selectAddress(created.id);
          toast.success(t('checkout.addressModal.savedSelected'));
          handleClose();
        },
        // P2-1 审查修复（20261105）：useCreateAddress 的 onError 只做缓存回滚不弹 toast，
        // 保存失败必须可见（弱网规则 10）——错误码翻译与 app/address/edit.tsx:176-199 同款
        // （提取 response.data.error.code → t(`errors.${code}`)，无 code 回退原文/generic）
        onError: (error: unknown) => {
          const err = error as {
            response?: { data?: { error?: { code?: string; message?: string } } };
            message?: string;
          };
          const code = err?.response?.data?.error?.code;
          const fallback = err?.response?.data?.error?.message ?? err?.message;
          const translated = code
            ? t(`errors.${code}`, { defaultValue: fallback ?? t('errors.generic') })
            : (fallback ?? t('errors.generic'));
          toast.error(translated);
        },
      },
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title={t('checkout.addressModal.title')}
      testID="checkout-address-modal"
      footer={
        <Button
          label={t('common.save')}
          variant="primary"
          fullWidth
          onPress={handleSubmit(onSubmit)}
          loading={createAddress.isPending}
          disabled={createAddress.isPending}
          testID="checkout-address-save"
        />
      }
    >
      {/* content_paste 智能识别入口（address/list.tsx 同款 parseAddressText） */}
      <Pressable
        onPress={() => setSmartVisible(true)}
        style={({ pressed }) => [
          styles.smartEntry,
          {
            backgroundColor: colors.semantic['info-container'],
            borderColor: colors.semantic.info,
          },
          pressed && { opacity: 0.7 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('address.smartRecognize')}
        testID="checkout-address-smart-entry"
      >
        <Icon symbol="content_paste" size={18} color={colors.semantic.info} />
        <Text style={[styles.smartEntryText, { color: colors['on-surface'] }]}>
          {t('address.smartRecognize')}
        </Text>
      </Pressable>
      <View style={styles.form}>
        <FormInput
          name="recipientName"
          control={control}
          label={t('address.name')}
          placeholder={t('address.namePlaceholder')}
          tError={(msg) => t(msg)}
          testID="checkout-address-name"
        />
        <FormInput
          name="phone"
          control={control}
          label={t('address.phone')}
          placeholder={t('address.phonePlaceholder')}
          keyboardType="phone-pad"
          tError={(msg) => t(msg)}
          testID="checkout-address-phone"
        />
        <FormInput
          name="detail"
          control={control}
          label={t('address.detail')}
          placeholder={t('address.detailPlaceholder')}
          multiline
          tError={(msg) => t(msg)}
          testID="checkout-address-detail"
        />
      </View>

      {/* 智能识别二级 Modal：粘贴文本（受控 TextInput，纯本地 state 非 RHF 字段）→ 解析回填主表单 */}
      <Modal
        visible={smartVisible}
        onClose={() => setSmartVisible(false)}
        title={t('address.smartRecognize')}
        testID="checkout-address-smart-modal"
        footer={
          <Button
            label={t('address.parseAndFill')}
            variant="primary"
            fullWidth
            onPress={handleSmartParse}
            disabled={!smartText.trim()}
            testID="checkout-address-smart-parse"
          />
        }
      >
        <TextInput
          style={[
            styles.smartInput,
            {
              backgroundColor: colors['surface-container-lowest'],
              borderColor: colors['outline-variant'],
              color: colors['on-surface'],
            },
          ]}
          placeholder={t('address.smartPlaceholder')}
          placeholderTextColor={colors['on-surface-variant']}
          value={smartText}
          onChangeText={setSmartText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel={t('address.smartRecognize')}
          testID="checkout-address-smart-input"
        />
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  smartEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  smartEntryText: {
    ...typography['body-sm'],
    fontWeight: '600',
    flex: 1,
  },
  form: { gap: spacing.md },
  smartInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 88,
    ...typography['body-md'],
  },
});
