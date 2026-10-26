import { Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '../ui/AppIcon';
import { Button } from '../ui/Button';

type EmptyStateProps = {
  title: string;
  description?: string;
  /** R-P2-21（走查 20261024）：空态图标（对齐客户端版 icon + CTA；缺省无图标保持旧形态） */
  iconName?: AppIconName;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  iconName,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-center rounded-3xl bg-surface p-6">
      {iconName ? (
        <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-surface-container">
          <AppIcon className="text-2xl text-on-surface-variant" name={iconName} />
        </View>
      ) : null}
      <Text className="text-lg font-bold text-on-surface">{title}</Text>
      {description ? (
        <Text className="mt-2 text-center text-sm text-on-surface-variant">{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-4 self-stretch" variant="outline" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
