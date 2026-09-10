/**
 * 渐变预设（expo-linear-gradient）—— T8 hero 渐变二期（拍板 A2：一期 flat 语义色稳定 token，二期还原原型渐变）
 *
 * 翻译自保证金原型 .deposit-hero 三态（HTML：linear-gradient(135deg, A, B)）：
 * CSS 135deg = 左上→右下对角，对应 start {x:0,y:0} / end {x:1,y:1}。
 * 首段色即既有语义 token 同值（surface-container-low / status-done-bg / warn-bg），
 * 尾段色为原型渐变特有中间态（#ffe1dc=surface-blush 同值 / #dcf5e3=colors.statusSuccessBg 同值 / #ffe8cc 原型独有）。
 * Why 渐变色在此集中为 hex 而非 className：LinearGradient 的 colors 是 JS prop（非 tailwind class），
 * 主题文件集中定义即「theme colors 引用」（对齐 client-app src/theme/gradients.ts 先例）。
 *
 * Why 不进 package.json：expo-linear-gradient 由 client-app 声明 ~56.0.4、pnpm 根
 * hoisted 单副本可解析（与 AsyncStorage / expo-device「workspace 根包」同款先例）。
 */

export type GradientPreset = {
  colors: [string, string];
  start: { x: number; y: number };
  end: { x: number; y: number };
};

/** 保证金详情页三态 hero 背景（index.tsx heroVisual 配套） */
export const depositHeroGradients: Record<'unpaid' | 'paid' | 'pending', GradientPreset> = {
  // unpaid：linear-gradient(135deg,#fff0ee,#ffe1dc)
  unpaid: { colors: ['#fff0ee', '#ffe1dc'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  // paid：linear-gradient(135deg,#e6f4ea,#dcf5e3)
  paid: { colors: ['#e6f4ea', '#dcf5e3'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  // pending：linear-gradient(135deg,#fff3e0,#ffe8cc)
  pending: { colors: ['#fff3e0', '#ffe8cc'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
};
