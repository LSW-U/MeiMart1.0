/**
 * react-native 最小 mock（web project / jsdom 用）
 *
 * Why: 真正的 react-native index.js 顶层访问 NativeModules/TurboModuleRegistry，
 * jsdom 无 RN runtime 会 invariant 崩溃（Button.test.tsx 实证）。组件测试只需要
 * Pressable/Text/View/ActivityIndicator 是"可渲染、可透传 props"的 host 壳。
 *
 * 方案：moduleNameMapper 把 react-native 指到本文件；每个组件渲染为带原样 props
 * 的 div（data-rn-host 标记组件名），onPress 接到 click 事件、disabled 挡掉。
 * 测试通过 React fiber（element 实例的 props）断言 accessibilityState 等透传。
 */
import React from 'react';

function makeHost(name) {
  return function Host(props) {
    const { onPress, disabled, children, ...rest } = props;
    // Why: children 若作为 props 属性透传，DOM 不会渲染子节点——需作实际 children 传入，
    // 嵌套 element（Text/ActivityIndicator 等）才能出现在 DOM 里供查询断言
    return React.createElement(
      'div',
      {
        'data-rn-host': name,
        onClick: disabled ? undefined : onPress,
        ...(rest.testID ? { 'data-testid': String(rest.testID) } : {}),
        ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [`data-prop-${k}`, typeof v === 'object' ? JSON.stringify(v) : String(v)])),
      },
      Array.isArray(children) ? children.filter(Boolean) : children,
    );
  };
}

// Animated.Value/timing 最小壳：Toast 等动画组件在 jsdom 里只需"启动即完成"
// （timing 回调同步触发），让 setTimeout 主导时序，测试不被动画卡住
function makeAnimatedValue(initial) {
  return { _value: initial };
}
const Animated = {
  View: makeHost('Animated.View'),
  Text: makeHost('Animated.Text'),
  timing: (value, _config) => ({
    start: (cb) => {
      if (typeof cb === 'function') cb({ finished: true });
    },
  }),
  Value: makeAnimatedValue,
};

module.exports = {
  Pressable: makeHost('Pressable'),
  Text: makeHost('Text'),
  View: makeHost('View'),
  ActivityIndicator: makeHost('ActivityIndicator'),
  ScrollView: makeHost('ScrollView'),
  TextInput: makeHost('TextInput'),
  Switch: makeHost('Switch'),
  Platform: { OS: 'web', select: (obj) => obj.web ?? obj.default },
  Animated,
};
