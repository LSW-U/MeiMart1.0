import { colors } from "../../theme/colors";
import { Modal as NativeModal, Pressable, Text, View } from 'react-native';

import type { DutyStatus } from '../../services/settings';
import { AppIcon } from '../ui';

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

export function DutyStatusMenu({ visible, current, title, cancelLabel, options, onPick, onClose }: DutyStatusMenuProps) {
  return (
    <NativeModal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 items-stretch justify-start bg-black/40 px-4 pt-24" onPress={onClose}>
        <Pressable className="self-center w-full max-w-md rounded-3xl bg-surface p-3 shadow-lg" onPress={() => null}>
          <Text className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-outline">{title}</Text>
          {options.map((option) => {
            const active = option.value === current;
            const disabled = !!option.disabled;
            const textTone = disabled ? 'text-dot-off' : active ? 'text-primary-container' : 'text-on-surface';
            return (
              <Pressable
                key={option.value}
                disabled={disabled}
                className={`flex-row items-center gap-3 rounded-2xl px-3 py-3 ${disabled ? '' : 'active:bg-surface-container-low'}`}
                onPress={() => onPick(option.value)}
              >
                <View className={`h-2.5 w-2.5 rounded-full ${disabled ? 'bg-outline-variant' : dotColor[option.value]}`} />
                <Text className={`flex-1 text-base font-semibold ${textTone}`}>{option.label}</Text>
                {/* A1：选中态 check 是品牌深红非危险色，改引 primaryContainer */}
                {active ? <AppIcon name="check" color={colors.primaryContainer} size={20} /> : null}
              </Pressable>
            );
          })}
          <Pressable className="mt-2 rounded-2xl border border-outline-variant py-3" onPress={onClose}>
            <Text className="text-center text-base font-semibold text-on-surface-variant">{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </NativeModal>
  );
}
