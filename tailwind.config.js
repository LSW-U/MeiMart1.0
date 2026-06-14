// 此文件作为「设计 Token 字典」参考，NativeWind 未激活。
// 项目采用 StyleSheet 精细翻译路线，详见 docs/style-strategy.md。
// 翻译 HTML 的 Tailwind class 时，请对照此文件的 colors/spacing/shadow 定义。
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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

        // 文化装饰色（非配置内联色值，扩展到 Tailwind 便于统一使用）
        cultural: {
          gold: '#D4A030',
          'warm-white': '#FAF7F2',
          orange: '#F97316',
          amber: '#F5BE4C',
          'splash-bg': '#FFF8F1',
          'diamond-red': '#a20513',
          tais: '#e4beba',
        },

        // 语义色
        semantic: {
          success: '#2E7D32',
          warning: '#F57C00',
          'error-high': '#C62828',
          info: '#1565C0',
        },
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        unit: '4px',
        gutter: '12px',
        'container-margin': '20px',
      },
      fontFamily: {
        h1: ['Noto Serif'],
        h2: ['Noto Serif'],
        h3: ['Noto Serif'],
        'body-sm': ['Plus Jakarta Sans'],
        'body-lg': ['Plus Jakarta Sans'],
        'body-md': ['Plus Jakarta Sans'],
        'label-caps': ['Plus Jakarta Sans'],
        'price-display': ['Plus Jakarta Sans'],
      },
      fontSize: {
        h1: ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        h2: ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        h3: ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '700' }],
        'price-display': ['20px', { lineHeight: '1.0', fontWeight: '700' }],
      },
      boxShadow: {
        'floating-cart': '0px 4px 6px rgba(150,24,19,0.2)',
        'bottom-nav': '0px -4px 6px -1px rgba(38,24,22,0.1)',
        'sticky-footer': '0px -4px 20px rgba(0,0,0,0.05)',
        'checkout-bar': '0px -10px 20px rgba(0,0,0,0.02)',
        'delivery-tracking': '0px -4px 12px 0px rgba(93,66,0,0.05)',
        'stamp-button': '4px 4px 0px 0px rgba(141,112,108,0.2)',
      },
      keyframes: {
        'pulse-dots': {
          '0%, 80%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200%' },
          '100%': { backgroundPosition: '200%' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-dots': 'pulse-dots 1.4s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
};
