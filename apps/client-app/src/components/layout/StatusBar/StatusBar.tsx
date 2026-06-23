import { StatusBar } from 'react-native';
import { useTheme } from '@/theme';
import type { StatusBarConfigProps } from './StatusBar.types';

export function StatusBarConfig({ hidden = false }: StatusBarConfigProps) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <StatusBar
      hidden={hidden}
      backgroundColor={colors['surface-container-lowest']}
      barStyle={isDark ? 'light-content' : 'dark-content'}
      translucent={false}
    />
  );
}
