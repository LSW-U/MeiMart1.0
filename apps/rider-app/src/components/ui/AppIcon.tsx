import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { colors } from '../../theme/colors';

export type AppIconName = 'menu' | 'notification' | 'settings' | 'refresh' | 'orders' | 'wallet' | 'upload' | 'camera' | 'profile' | 'document' | 'security' | 'bank' | 'rider' | 'help' | 'logout' | 'language' | 'shield' | 'bell' | 'chevronLeft' | 'chevronRight' | 'chevronDown' | 'check' | 'lock' | 'eye' | 'eyeOff' | 'sms' | 'info' | 'pickup' | 'dropoff' | 'arrowUp' | 'arrowDown' | 'verified';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type AppIconProps = {
  name: AppIconName;
  className?: string;
  color?: string;
  size?: number;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

const icons: Record<AppIconName, MaterialIconName> = {
  menu: 'menu',
  notification: 'bell-outline',
  settings: 'cog-outline',
  refresh: 'refresh',
  orders: 'clipboard-list-outline',
  wallet: 'wallet-outline',
  upload: 'upload-outline',
  camera: 'camera-outline',
  profile: 'account-outline',
  document: 'file-document-outline',
  security: 'shield-check-outline',
  bank: 'bank-outline',
  rider: 'bike-fast',
  help: 'help-circle-outline',
  logout: 'logout',
  language: 'translate',
  shield: 'shield-account-outline',
  bell: 'bell-ring-outline',
  chevronLeft: 'chevron-left',
  chevronRight: 'chevron-right',
  chevronDown: 'chevron-down',
  check: 'check',
  lock: 'lock-outline',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
  sms: 'cellphone-message',
  // B7: 字符图标占位清零新增（sign COD 提示 / navigate P·D 标记 / HistoryItem 收支 / EarningCard 已结算）
  info: 'information-outline',
  pickup: 'map-marker-radius',
  dropoff: 'map-marker-check-outline',
  arrowUp: 'arrow-up-bold',
  arrowDown: 'arrow-down-bold',
  verified: 'check-circle-outline',
};

// 适配层：调用方 className 用 text-primary 等 token，映射到 theme colors（颜色迁移后无遗留 #hex）
// 顺序敏感：text-primary-container 必须在 text-primary 前检测（否则前缀误匹配返 primary）
const colorByClass = (className = '') => {
  if (className.includes('text-white/60')) return colors.surface60;
  if (className.includes('text-white')) return colors.surface;
  if (className.includes('text-primary-container')) return colors.danger;
  if (className.includes('text-primary')) return colors.primary;
  if (className.includes('text-on-surface-variant')) return colors.textMuted;
  if (className.includes('text-on-surface')) return colors.text;
  if (className.includes('text-outline')) return colors.outline;
  return colors.textMuted;
};

const sizeByClass = (className = '') => {
  if (className.includes('text-5xl')) return 48;
  if (className.includes('text-2xl')) return 28;
  if (className.includes('text-xl')) return 22;
  if (className.includes('text-xs')) return 12;
  return 22;
};

// a11y：AppIcon 几乎总是装饰（在 labeled Pressable 内 / header·section 图标，含义由相邻 Text 说明）。
// 无 accessibilityLabel 时隐藏（importantForAccessibility='no' + accessibilityElementsHidden），
// 避免屏幕阅读器对无 label 的 image 发出无意义聚焦噪音；传 label 时作为带描述的 image 暴露。
export function AppIcon({ name, className = '', color, size, style, accessibilityLabel }: AppIconProps) {
  return (
    <MaterialCommunityIcons
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no'}
      color={color ?? colorByClass(className)}
      name={icons[name]}
      size={size ?? sizeByClass(className)}
      style={style}
    />
  );
}
