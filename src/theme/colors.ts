/**
 * 颜色主题（Material Design 3 色板，源自 HTML 原型）
 * 完整色板：40 个配置色 + 6 个文化装饰色
 */

type CulturalColors = {
  gold: string;
  warmWhite: string;
  orange: string;
  amber: string;
  splashBg: string;
  diamondRed: string;
};

type SemanticColors = {
  success: string;
  warning: string;
  error: string;
  info: string;
};

export type AppColors = {
  primary: string;
  'primary-container': string;
  'on-primary': string;
  'on-primary-container': string;
  'on-primary-fixed': string;
  'on-primary-fixed-variant': string;
  'primary-fixed': string;
  'primary-fixed-dim': string;
  'inverse-primary': string;
  'surface-tint': string;
  secondary: string;
  'secondary-container': string;
  'on-secondary': string;
  'on-secondary-container': string;
  'on-secondary-fixed': string;
  'on-secondary-fixed-variant': string;
  'secondary-fixed': string;
  'secondary-fixed-dim': string;
  tertiary: string;
  'tertiary-container': string;
  'on-tertiary': string;
  'on-tertiary-container': string;
  'on-tertiary-fixed': string;
  'on-tertiary-fixed-variant': string;
  'tertiary-fixed': string;
  'tertiary-fixed-dim': string;
  error: string;
  'error-container': string;
  'on-error': string;
  'on-error-container': string;
  background: string;
  surface: string;
  'surface-bright': string;
  'surface-dim': string;
  'surface-variant': string;
  'surface-container': string;
  'surface-container-low': string;
  'surface-container-lowest': string;
  'surface-container-high': string;
  'surface-container-highest': string;
  'on-background': string;
  'on-surface': string;
  'on-surface-variant': string;
  'inverse-surface': string;
  'inverse-on-surface': string;
  outline: string;
  'outline-variant': string;
  cultural: CulturalColors;
  semantic: SemanticColors;
};

export const lightColors: AppColors = {
  // Primary Palette（品牌红/东帝汶文化红）
  primary: '#961813',
  'primary-container': '#b83228',
  'on-primary': '#ffffff',
  'on-primary-container': '#ffd8d3',
  'on-primary-fixed': '#410001',
  'on-primary-fixed-variant': '#8e120e',
  'primary-fixed': '#ffdad5',
  'primary-fixed-dim': '#ffb4aa',
  'inverse-primary': '#ffb4aa',
  'surface-tint': '#b02d23',

  // Secondary Palette（中性灰）
  secondary: '#5d5f5f',
  'secondary-container': '#dfe0e0',
  'on-secondary': '#ffffff',
  'on-secondary-container': '#616363',
  'on-secondary-fixed': '#1a1c1c',
  'on-secondary-fixed-variant': '#454747',
  'secondary-fixed': '#e2e2e2',
  'secondary-fixed-dim': '#c6c6c7',

  // Tertiary Palette（金色/琥珀色 — 文化强调色）
  tertiary: '#634700',
  'tertiary-container': '#825d00',
  'on-tertiary': '#ffffff',
  'on-tertiary-container': '#ffdc9f',
  'on-tertiary-fixed': '#271900',
  'on-tertiary-fixed-variant': '#5d4200',
  'tertiary-fixed': '#ffdea5',
  'tertiary-fixed-dim': '#f5be4c',

  // Error Palette
  error: '#ba1a1a',
  'error-container': '#ffdad6',
  'on-error': '#ffffff',
  'on-error-container': '#93000a',

  // Surface Palette（暖粉白色）
  background: '#fff8f7',
  surface: '#fff8f7',
  'surface-bright': '#fff8f7',
  'surface-dim': '#eed4d1',
  'surface-variant': '#f7ddd9',
  'surface-container': '#ffe9e6',
  'surface-container-low': '#fff0ee',
  'surface-container-lowest': '#ffffff',
  'surface-container-high': '#fce2df',
  'surface-container-highest': '#f7ddd9',
  'on-background': '#261816',
  'on-surface': '#261816',
  'on-surface-variant': '#59413d',
  'inverse-surface': '#3c2d2b',
  'inverse-on-surface': '#ffedea',

  // Outline Palette
  outline: '#8d706c',
  'outline-variant': '#e1bfba',

  // 文化装饰色（非配置内联色值）
  cultural: {
    gold: '#D4A030',
    warmWhite: '#FAF7F2',
    orange: '#F97316',
    amber: '#F5BE4C',
    splashBg: '#FFF8F1',
    diamondRed: '#a20513',
  },

  // 语义色（用于状态提示，与 HTML 一致）
  semantic: {
    success: '#2E7D32',
    warning: '#F57C00',
    error: '#C62828',
    info: '#1565C0',
  },
} as const;

/**
 * 暗色主题（Material Design 3 dark theme 规范推导）
 * HTML 原型仅声明 `darkMode: "class"` 未实际实现暗色样式，
 * 此处按 M3 dark theme 标准推导：容器色与 on-* 色对调，背景翻转为深色。
 */
export const darkColors: AppColors = {
  // Primary Palette
  primary: '#ffb4aa',
  'primary-container': '#93000a',
  'on-primary': '#690005',
  'on-primary-container': '#ffdad4',
  'on-primary-fixed': '#410001',
  'on-primary-fixed-variant': '#ff5c4e',
  'primary-fixed': '#ffdad5',
  'primary-fixed-dim': '#ffb4aa',
  'inverse-primary': '#961813',
  'surface-tint': '#ffb4aa',

  // Secondary Palette
  secondary: '#c6c6c7',
  'secondary-container': '#454747',
  'on-secondary': '#303030',
  'on-secondary-container': '#dadbc0',
  'on-secondary-fixed': '#1a1c1c',
  'on-secondary-fixed-variant': '#a9abb0',
  'secondary-fixed': '#e2e2e2',
  'secondary-fixed-dim': '#c6c6c7',

  // Tertiary Palette
  tertiary: '#f5be4c',
  'tertiary-container': '#5d4200',
  'on-tertiary': '#3f2d00',
  'on-tertiary-container': '#ffdea5',
  'on-tertiary-fixed': '#271900',
  'on-tertiary-fixed-variant': '#d9a237',
  'tertiary-fixed': '#ffdea5',
  'tertiary-fixed-dim': '#f5be4c',

  // Error Palette
  error: '#ffb4ab',
  'error-container': '#93000a',
  'on-error': '#690005',
  'on-error-container': '#ffdad6',

  // Surface Palette
  background: '#201A19',
  surface: '#201A19',
  'surface-bright': '#3b2f2d',
  'surface-dim': '#201A19',
  'surface-variant': '#59413d',
  'surface-container': '#362f2d',
  'surface-container-low': '#2c2524',
  'surface-container-lowest': '#1a1413',
  'surface-container-high': '#413a38',
  'surface-container-highest': '#4c4442',
  'on-background': '#ffedea',
  'on-surface': '#ffedea',
  'on-surface-variant': '#e1bfba',
  'inverse-surface': '#ffedea',
  'inverse-on-surface': '#201A19',

  // Outline Palette
  outline: '#9c8c89',
  'outline-variant': '#59413d',

  // 文化装饰色（暗色版调整亮度）
  cultural: {
    gold: '#E8B84B',
    warmWhite: '#3b2f2d',
    orange: '#FB923C',
    amber: '#F5BE4C',
    splashBg: '#201A19',
    diamondRed: '#FF6F6F',
  },

  // 语义色（暗色版调整亮度）
  semantic: {
    success: '#81C784',
    warning: '#FFB74D',
    error: '#EF9A9A',
    info: '#64B5F6',
  },
} as const;
