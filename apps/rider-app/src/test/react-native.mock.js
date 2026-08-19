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
 *
 * 函数 props（onRefresh 等）额外挂两处（T1 审查 P3-1 tasks 页测试需要）：
 *   - data-fn-<name> attribute：DOM 可见标记（字符串化）
 *   - DOM 节点 __fnProps 对象：原函数引用，测试取回直调——下拉手势 jsdom 模拟不了，
 *     直调回调等价验证守卫逻辑（attribute 只能存字符串，取不回函数）
 */
import React from 'react';

// data-prop-* 序列化：对象走 safe stringify（React element/组件引用等循环结构落
// '[object]' 兜底而非炸掉整个测试——tasks 页经 props 透传 Provider 类引用实证）
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

function makeHost(name) {
  return function Host(props) {
    const { onPress, disabled, children, ...rest } = props;
    // Why: children 若作为 props 属性透传，DOM 不会渲染子节点——需作实际 children 传入，
    // 嵌套 element（Text/ActivityIndicator 等）才能出现在 DOM 里供查询断言
    const fnProps = {};
    const fnRefs = {};
    for (const [k, v] of Object.entries(rest)) {
      if (typeof v === 'function') {
        fnProps[`data-fn-${k}`] = '';
        fnRefs[k] = v;
      }
    }
    const attachFnProps = (node) => {
      if (node) node.__fnProps = fnRefs;
    };
    return React.createElement(
      'div',
      {
        ref: attachFnProps,
        'data-rn-host': name,
        onClick: disabled ? undefined : onPress,
        ...(rest.testID ? { 'data-testid': String(rest.testID) } : {}),
        ...fnProps,
        ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [`data-prop-${k}`, propToAttr(v)])),
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
  ScrollView: function ScrollView(props) {
    const { refreshControl, children, ...rest } = props;
    return React.createElement(
      makeHost('ScrollView'),
      rest,
      refreshControl ? [React.cloneElement(refreshControl, { key: 'rc' }), children] : children,
    );
  },
  TextInput: makeHost('TextInput'),
  Switch: makeHost('Switch'),
  // T1 审查 P3-1：tasks 页下拉刷新/切班弹窗测试需要。
  // - RefreshControl 走 makeHost（onRefresh 经 __fnProps 可取回直调）——但 RN 真源码里
  //   refreshControl prop 是 ScrollView 的「配置对象」不是 children，host 壳若不透传会
  //   丢标签。ScrollView wrapper 把它渲染为首个子节点（带原 props）。
  // - Modal visible=false 时不渲染 children（对齐 RN 真行为，弹窗关闭断言依赖此语义）
  RefreshControl: makeHost('RefreshControl'),
  Modal: function Modal(props) {
    const { visible, children, ...rest } = props;
    if (visible === false) return null;
    return React.createElement('div', {
      'data-rn-host': 'Modal',
      ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [`data-prop-${k}`, propToAttr(v)])),
    }, children);
  },
  Platform: { OS: 'web', select: (obj) => obj.web ?? obj.default },
  Animated,
};
