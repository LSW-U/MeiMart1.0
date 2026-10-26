/** @type {import('tailwindcss').Config} */
// R-P1-7（走查 20261024 · D2=A 拍板）：颜色单一真源 = src/theme/colors.ts（camelCase），
// 本 config 用 camel→kebab 自动生成映射，改值只动 colors.ts。
// - ALIAS：JS 语义名与原型 class 名不同名的 4 对（历史两套命名，值同源 colors.ts）
// - SKIP_AUTO：4 个自动键（text/border/primary-soft/text-muted）无 class 消费且语义歧义，排除
// - darkMode:'class' 死配置已删（R-P1-11，全库无 dark: 消费）
const { colors } = require('./src/theme/colors');

const toKebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const ALIAS = {
  'surface-container': colors.primarySoft,
  'surface-variant': colors.border,
  'on-surface': colors.text,
  'on-surface-variant': colors.textMuted,
};
const SKIP_AUTO = new Set(['text', 'border', 'primary-soft', 'text-muted']);

const generated = {};
for (const [k, v] of Object.entries(colors)) {
  const kebab = toKebab(k);
  if (!SKIP_AUTO.has(kebab)) generated[kebab] = v;
}

module.exports = {
  // R-P1-11 回滚（20261026）：原判「死配置」有误——darkMode 决定 react-native-css-interop
  // 配色策略；删后落默认 'media'，其 web runtime 的 colorScheme.set（含自身 MutationObserver
  // 自动路径）即 throw "Cannot manually set color scheme"。恢复 class 策略（本库无 dark:
  // 类消费，class 下恒 light，等效锁亮色，与批B 前行为一致）。
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ...generated,
        ...ALIAS,
      },
    },
  },
};
