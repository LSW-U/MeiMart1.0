export interface StatusBadgeProps {
  text: string;
  backgroundColor: string;
  testID?: string;
  /**
   * 前景文字色（P1-16）。默认白——调用方 bg 为静态饱和色板（statusBannerThemes 单套无 dark 变体），
   * 白字两主题恒 ≥4.5:1；dark 真适配待色板加变体时由调用方传 theme-aware 色。
   */
  textColor?: string;
}
