import { type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../ui/AppIcon';
import { useGoBack } from '../../hooks/useGoBack';

/**
 * StepPageHeader —— 步骤页统一页头（B4，pickup/navigate/sign）
 *
 * 规格（方案 §3.1 / 原型 .header-center）：
 * - h-16 三栏布局：左返回 44x44 | 中标题绝对定位居中 | 右 action 或 44px 占位
 * - 返回箭头 text-primary（与标题同色，维持步骤页现状分色）
 * - 无 action 时渲染同宽占位，保证标题视觉居中
 * - navigate 假 STATUS 点等业务元素不进组件（T4 处理）
 */
type StepPageHeaderProps = {
  title: string;
  backLabel: string;
  fallbackHref?: Href;
  actionLabel?: string;
  onAction?: () => void;
};

export function StepPageHeader({ title, backLabel, fallbackHref, actionLabel, onAction }: StepPageHeaderProps) {
  const goBack = useGoBack(fallbackHref);

  return (
    <View className="h-16 flex-row items-center justify-between bg-surface px-5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-container"
        onPress={() => void goBack()}
      >
        <AppIcon className="text-2xl text-primary" name="chevronLeft" size={28} />
      </Pressable>
      {/* 三栏居中：左右 44px 命中区之外的剩余空间承载标题，numberOfLines 防长标题换行 */}
      <Text className="flex-1 px-2 text-center text-xl font-bold text-primary" numberOfLines={1}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-container"
          onPress={onAction}
        >
          <AppIcon className="text-2xl text-primary" name="help" size={24} />
        </Pressable>
      ) : (
        <View className="h-11 w-11" />
      )}
    </View>
  );
}
