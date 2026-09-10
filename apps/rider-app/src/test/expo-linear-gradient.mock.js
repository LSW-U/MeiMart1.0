/**
 * expo-linear-gradient mock（web project / jsdom 用）
 *
 * Why: T8 hero 渐变二期引入 expo-linear-gradient——原生宿主模块（jsdom 无 runtime），
 * 且真包构建超出 web project transformIgnorePatterns 放行列表（仅 @tanstack/react-query
 * 与 react-native）。桩成可断言 host：colors/start/end/style 以 data-prop-* 透出，
 * 页面测试据此锚渐变配置（deposit.test.tsx T8 走查断言）。
 * children 正常渲染（hero 内容在渐变层之上，查询断言不隔离）。
 */
import React from 'react';

// data-prop-* 序列化：对象走 safe stringify（对齐 react-native.mock.js 同名 helper）
function propToAttr(v) {
  if (typeof v === 'object' && v !== null) {
    try {
      return JSON.stringify(v);
    } catch {
      return '[object]';
    }
  }
  return String(v);
}

export function LinearGradient(props) {
  const { children, ...rest } = props;
  return React.createElement(
    'div',
    {
      'data-rn-host': 'LinearGradient',
      ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [`data-prop-${k}`, propToAttr(v)])),
    },
    Array.isArray(children) ? children.filter(Boolean) : children,
  );
}

export default LinearGradient;
