import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { AppIcon } from '../ui/AppIcon';

/**
 * BottomActionBar —— 「设置入口 + 刷新胶囊」统一底栏（B5，tasks 列表 / task 详情）
 *
 * 规格（方案 §3.1/§5）：
 * - 容器 gap-3 border-t bg-surface px-4 pt-3 shadow-sm；safe-area 兜底内置
 *   （paddingBottom=max(insets.bottom,12)，调用方不再手写）
 * - absolute（默认 false）：true 时加 absolute bottom-0 浮层（[id] 页，ScrollView pb-28 避让）
 * - 刷新 isFetching 反馈：图标位换 ActivityIndicator + disabled 真阻断 + busy a11y
 * - 不耦合 query：isRefreshing 由调用方从 query.isFetching 透传
 */
type BottomActionBarProps = {
  settingsLabel: string;
  refreshLabel: string;
  isRefreshing: boolean;
  onPressSettings: () => void;
  onRefresh: () => void;
  absolute?: boolean;
};

export function BottomActionBar({ settingsLabel, refreshLabel, isRefreshing, onPressSettings, onRefresh, absolute = false }: BottomActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={`flex-row items-center gap-3 border-t border-surface-variant bg-surface px-4 pt-3 shadow-sm ${absolute ? 'absolute bottom-0 left-0 right-0' : ''}`}
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <Pressable accessibilityRole="button" accessibilityLabel={settingsLabel} className="items-center px-3 py-1" onPress={onPressSettings}>
        <AppIcon className="text-2xl text-on-surface-variant" name="settings" />
        <Text className="mt-1 text-[11px] font-bold text-on-surface-variant">{settingsLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={refreshLabel}
        accessibilityState={{ busy: isRefreshing }}
        className="flex-1 flex-row items-center justify-center gap-2 rounded-full border border-outline-variant bg-white py-3.5 shadow-sm"
        disabled={isRefreshing}
        onPress={onRefresh}
        style={{ opacity: isRefreshing ? 0.75 : 1 }}
      >
        {isRefreshing ? (
          // colors.danger = AppIcon colorByClass 的 text-primary-container 映射色（同色反馈）
          <ActivityIndicator color={colors.danger} />
        ) : (
          <AppIcon className="text-xl text-primary-container" name="refresh" />
        )}
        <Text className="text-base font-bold text-primary-container">{refreshLabel}</Text>
      </Pressable>
    </View>
  );
}
