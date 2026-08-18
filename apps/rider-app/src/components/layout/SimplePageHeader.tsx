import { type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../ui/AppIcon';
import { useGoBack } from '../../hooks/useGoBack';

/**
 * SimplePageHeader —— 辅助页统一页头（B4，notifications/settings/help/terms/privacy/register/profile-edit）
 *
 * 规格（方案 §3.2）：
 * - h-16 定高（原 5 处 px-5 py-4 视觉等价）+ border-b
 * - 标题左对齐（与返回同 flex 行 ml-2），返回箭头 text-on-surface（维持辅助页现状分色）
 * - action 为可选 ReactNode（如 notifications「全部已读」），必须自带 a11y 属性；
 *   无 action 不渲染占位
 */
type SimplePageHeaderProps = {
  title: string;
  backLabel: string;
  fallbackHref?: Href;
  action?: ReactNode;
};

export function SimplePageHeader({ title, backLabel, fallbackHref, action }: SimplePageHeaderProps) {
  const goBack = useGoBack(fallbackHref);

  return (
    <View className="h-16 flex-row items-center justify-between border-b border-surface-variant bg-surface px-5">
      <View className="flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-container"
          onPress={() => void goBack()}
        >
          <AppIcon className="text-2xl text-on-surface" name="chevronLeft" size={28} />
        </Pressable>
        <Text className="ml-2 text-xl font-semibold text-on-surface" numberOfLines={1}>{title}</Text>
      </View>
      {action ?? null}
    </View>
  );
}
