// PhonePrefix — 手机号国际区号前缀块（批A2-3 任务书#1）
// 一期只读固定 +670（东帝汶），视觉自 Input 的 .prefix-block 抽出（15/700 primary + 1.5px 分隔线）；
// 留扩展位：后续支持多国可选时改为可交互组件，调用方（4 个 auth 页）只需换组件不改布局
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme';

// Why: 区号常量随组件同文件导出——4 个 auth 页以 prefix={PHONE_PREFIX} 引用，
// 消灭散落各页的硬编码字面量；未来多国化改这一处即可
export const PHONE_PREFIX = '+670';

export function PhonePrefix({ code = PHONE_PREFIX }: { code?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.text, { color: colors.primary }]}>{code}</Text>
      <View style={[styles.divider, { backgroundColor: colors['surface-variant'] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  // .prefix-block：右侧 1.5px var(--outline) 分隔线（= surface-variant 浅粉）
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    width: 1.5,
    height: 20,
    marginLeft: 8,
    marginRight: 10,
  },
});
