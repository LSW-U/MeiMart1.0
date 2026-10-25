import { colors } from '../../theme/colors';
import { Pressable, Text, View } from 'react-native';

import type { DutyStatus } from '../../services/settings';
import { useTranslation } from '../../i18n/useTranslation';
import { AppIcon, Modal } from '../ui';

type DutyStatusOption = {
  value: DutyStatus;
  label: string;
  disabled?: boolean;
};

type DutyStatusMenuProps = {
  visible: boolean;
  current: DutyStatus;
  title: string;
  cancelLabel: string;
  options: DutyStatusOption[];
  onPick: (status: DutyStatus) => void;
  onClose: () => void;
};

// A2 收口：busy 点专用 token bg-busy（原复用 status-transferred-text「已转单」取值，语义错位）
const dotColor: Record<DutyStatus, string> = {
  onDuty: 'bg-success-deep',
  busy: 'bg-busy',
  offDuty: 'bg-dot-off',
};

export function DutyStatusMenu({
  visible,
  current,
  title,
  cancelLabel,
  options,
  onPick,
  onClose,
}: DutyStatusMenuProps) {
  // C-P2-9: 可点项补 accessibilityLabel（option.label 为 t() 后的显示文案，直接复用作 label）
  const { t } = useTranslation();
  return (
    // R-P1-13（走查 20261024 · D4=B）：弹窗基座收编——backdrop 关闭 / alert 语义 /
    // 阻冒泡统一进 Modal，本组件只保留下拉布局形态（backdrop 顶部对齐）
    <Modal
      backdropClassName="flex-1 items-stretch justify-start bg-black/40 px-4 pt-24"
      backdropCloseLabel={cancelLabel}
      sheetClassName="w-full max-w-md self-center rounded-3xl bg-surface p-3 shadow-lg"
      visible={visible}
      onClose={onClose}
    >
      <Text className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {title}
      </Text>
      {options.map((option) => {
        const active = option.value === current;
        const disabled = !!option.disabled;
        const textTone = disabled
          ? 'text-dot-off'
          : active
            ? 'text-primary-container'
            : 'text-on-surface';
        return (
          <Pressable
            key={option.value}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t('duty.a11y.pick', { status: option.label })}
            className={`flex-row items-center gap-3 rounded-2xl px-3 py-3 ${disabled ? '' : 'active:bg-surface-container-low'}`}
            onPress={() => onPick(option.value)}
          >
            <View
              className={`h-2.5 w-2.5 rounded-full ${disabled ? 'bg-outline-variant' : dotColor[option.value]}`}
            />
            <Text className={`flex-1 text-base font-semibold ${textTone}`}>{option.label}</Text>
            {/* A1：选中态 check 是品牌深红非危险色，改引 primaryContainer */}
            {active ? <AppIcon name="check" color={colors.primaryContainer} size={20} /> : null}
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('duty.menu.cancel')}
        className="mt-2 rounded-2xl border border-outline-variant py-3"
        onPress={onClose}
      >
        <Text className="text-center text-base font-semibold text-on-surface-variant">
          {cancelLabel}
        </Text>
      </Pressable>
    </Modal>
  );
}
