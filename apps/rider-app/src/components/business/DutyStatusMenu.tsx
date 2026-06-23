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

const dotColor: Record<DutyStatus, string> = {
  onDuty: 'bg-green-500',
  busy: 'bg-orange-500',
  offDuty: 'bg-[#b9aaa7]',
};

export function DutyStatusMenu({ visible, current, title, cancelLabel, options, onPick, onClose }: DutyStatusMenuProps) {
  return (
    <NativeModal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 items-stretch justify-start bg-black/40 px-4 pt-24" onPress={onClose}>
        <Pressable className="self-center w-full max-w-md rounded-3xl bg-white p-3 shadow-lg" onPress={() => null}>
          <Text className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-wider text-[#8d706c]">{title}</Text>
          {options.map((option) => {
            const active = option.value === current;
            const disabled = !!option.disabled;
            const textTone = disabled ? 'text-[#b9aaa7]' : active ? 'text-[#961813]' : 'text-[#261816]';
            return (
              <Pressable
                key={option.value}
                disabled={disabled}
                className={`flex-row items-center gap-3 rounded-2xl px-3 py-3 ${disabled ? '' : 'active:bg-[#fff0ee]'}`}
                onPress={() => onPick(option.value)}
              >
                <View className={`h-2.5 w-2.5 rounded-full ${disabled ? 'bg-[#e1bfba]' : dotColor[option.value]}`} />
                <Text className={`flex-1 text-base font-semibold ${textTone}`}>{option.label}</Text>
                {active ? <AppIcon name="check" color="#961813" size={20} /> : null}
              </Pressable>
            );
          })}
          <Pressable className="mt-2 rounded-2xl border border-[#e1bfba] py-3" onPress={onClose}>
            <Text className="text-center text-base font-semibold text-[#59413d]">{cancelLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </NativeModal>
  );
}
