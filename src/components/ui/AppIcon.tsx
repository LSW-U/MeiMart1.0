import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { colors } from '../../theme/colors';

type AppIconName = 'menu' | 'notification' | 'settings' | 'refresh' | 'orders' | 'wallet' | 'upload' | 'camera' | 'profile' | 'document' | 'security' | 'bank' | 'rider' | 'help' | 'logout' | 'language' | 'shield' | 'bell' | 'chevronRight' | 'chevronDown' | 'check' | 'lock' | 'eye' | 'eyeOff' | 'sms';

type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type AppIconProps = {
  name: AppIconName;
  className?: string;
  color?: string;
  size?: number;
  style?: StyleProp<TextStyle>;
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
  chevronRight: 'chevron-right',
  chevronDown: 'chevron-down',
  check: 'check',
  lock: 'lock-outline',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
  sms: 'cellphone-message',
};

const colorByClass = (className = '') => {
  if (className.includes('text-white')) return colors.surface;
  if (className.includes('text-[#720003]')) return colors.primary;
  if (className.includes('text-[#961813]')) return colors.danger;
  if (className.includes('text-white/60')) return 'rgba(255,255,255,0.6)';
  return colors.textMuted;
};

const sizeByClass = (className = '') => {
  if (className.includes('text-5xl')) return 48;
  if (className.includes('text-2xl')) return 28;
  if (className.includes('text-xl')) return 22;
  if (className.includes('text-xs')) return 12;
  return 22;
};

export function AppIcon({ name, className = '', color, size, style }: AppIconProps) {
  return <MaterialCommunityIcons color={color ?? colorByClass(className)} name={icons[name]} size={size ?? sizeByClass(className)} style={style} />;
}
