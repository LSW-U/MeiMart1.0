/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // 审查修复 P2-3：真值以 B1/B7 原型 CSS 变量与 colors.ts 为准——
        // --bg:#fff8f7（页面背景暖白）/ --surface:#ffffff（卡片纯白）。
        // 原 surface:'#fff8f7' 是历史笔误（把 background 值写进了 surface）。
        background: '#fff8f7',
        primary: '#720003',
        'primary-container': '#961813',
        surface: '#ffffff',
        'surface-container': '#ffe9e6',
        'surface-container-low': '#fff0ee',
        'surface-container-high': '#fde2df',
        'surface-variant': '#f7ddd9',
        'on-surface': '#261816',
        'on-surface-variant': '#59413d',
        outline: '#8d706c',
        'outline-variant': '#e1bfba',
        tertiary: '#463200',
        'tertiary-container': '#634700',
        error: '#ba1a1a',

        // 状态标签语义色（HTML 原型色，规则23 保留，不复用 statusSuccess/Danger/Warning 避免影响 order 页）
        'status-done-bg': '#e6f4ea',
        'status-done-text': '#137333',
        'status-cancelled-bg': '#e2e3e2',
        'status-cancelled-text': '#1a1c1c',
        'status-transferred-bg': '#fef7e0',
        'status-transferred-text': '#b06000',
        'warn-bg': '#fff3e0',
        'warn-border': '#ffe0b2',
        'warn-text': '#e65100',
        'accent-amber': '#f59e0b',
        'success-deep': '#2d6a2e',

        // 中性灰系
        'neutral-bg': '#e2e3e2',
        neutral: '#636565',
        'neutral-muted': '#5d5f5f',

        // 等级/装饰金
        'tier-gold': '#deb769',
        'tier-gold-soft': '#ffdea3',
        'tier-gold-text': '#5d4200',

        // surface 近似 + 状态点
        'surface-track': '#d7c1bd',
        'surface-frame': '#eed4d1',
        'dot-off': '#b9aaa7',
        'dot-unread': '#ff4d4f',

        // 通知/危险辅助色（HTML 原型色）
        'notification-task': '#ff9800',
        'surface-blush': '#ffe1dc',
        'blush-border': '#f1d4cf',
        'status-danger-text': '#a3322a',
        'danger-soft': '#ffdad6',
      },
    },
  },
};
