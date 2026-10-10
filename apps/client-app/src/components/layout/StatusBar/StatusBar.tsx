import { StatusBar } from 'react-native';
import { useTheme } from '@/theme';
import type { StatusBarConfigProps } from './StatusBar.types';

// B-P2-6: 'system' 模式此前漏判——mode==='system' 时被当 light 处理，系统深色下状态栏
// 深字压深底不可读。改用 resolvedTheme（ThemeProvider 已按 useColorScheme 解析 system，
// 无需再在本组件重复 useColorScheme）。
export function StatusBarConfig({ hidden = false }: StatusBarConfigProps) {
  const { colors, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <StatusBar
      hidden={hidden}
      backgroundColor={colors['surface-container-lowest']}
      barStyle={isDark ? 'light-content' : 'dark-content'}
      translucent={false}
    />
  );
}
