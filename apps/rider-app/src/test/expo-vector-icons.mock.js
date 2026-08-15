/**
 * @expo/vector-icons 最小 mock（web project / jsdom 用）
 *
 * Why: 真包 ESM 发布（build/*.js 顶层 import），web project 的 transformIgnorePatterns
 * 不含它 → jsdom 报 "Cannot use import statement outside a module"（QueryBoundary
 * 经 Button→AppIcon 拉入，实证）。图标组件在测试里只需渲染为带 name 的 host 壳。
 */
import React from 'react';

function makeIconSet() {
  return function MockIcon(props) {
    const { name } = props;
    return React.createElement('span', { 'data-testid': `icon-${name}` }, name ?? '');
  };
}

module.exports = {
  MaterialCommunityIcons: makeIconSet(),
  AntDesign: makeIconSet(),
  Ionicons: makeIconSet(),
  FontAwesome: makeIconSet(),
  Entypo: makeIconSet(),
  Feather: makeIconSet(),
};
