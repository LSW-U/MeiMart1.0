import type { StyleProp, TextStyle } from 'react-native';
import { Text } from 'react-native';

type AppIconName = 'menu' | 'notification' | 'settings' | 'refresh' | 'orders' | 'wallet' | 'upload' | 'camera' | 'profile' | 'document' | 'security' | 'bank' | 'rider';

type AppIconProps = {
  name: AppIconName;
  className?: string;
  style?: StyleProp<TextStyle>;
};

const icons: Record<AppIconName, string> = {
  menu: '☰',
  notification: '●',
  settings: '⚙',
  refresh: '↻',
  orders: '☷',
  wallet: '▣',
  upload: '⇧',
  camera: '◎',
  profile: '◉',
  document: '▤',
  security: '◆',
  bank: '▥',
  rider: '◆',
};

export function AppIcon({ name, className = '', style }: AppIconProps) {
  return <Text className={className} style={style}>{icons[name]}</Text>;
}
