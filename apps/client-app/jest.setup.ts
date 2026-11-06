// Mock AsyncStorage for tests
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock @expo/vector-icons to avoid native font loading
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Mock = ({ name, size, color, testID }: any) =>
    React.createElement(Text, { testID: testID || `icon-${name}`, size, color }, name || '');
  return {
    MaterialCommunityIcons: Mock,
    Ionicons: Mock,
    FontAwesome: Mock,
    MaterialIcons: Mock,
    Entypo: Mock,
    Feather: Mock,
  };
});

// Mock react-native-safe-area-context（页面组件测试基建，SafeAreaWrapper 依赖）
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: (props: any) => React.createElement(View, props),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  };
});

// Mock @react-native-community/netinfo（useNetwork 依赖，页面组件测试基建）
jest.mock('@react-native-community/netinfo', () => ({
  default: {
    addEventListener: () => () => {},
    fetch: () => Promise.resolve({ isConnected: true, isInternetReachable: true }),
  },
  addEventListener: () => () => {},
  fetch: () => Promise.resolve({ isConnected: true, isInternetReachable: true }),
}));

// Mock @shopify/flash-list（搜索结果页瀑布流批 20261106：结果区迁 FlashList masonry 后的
// 测试基建，netinfo mock 同款先例）。jsdom 下 FlashList 依赖 native AutoLayoutView/CellContainer
// 会崩；且 masonry 虚拟化依赖真实视口。这里语义 mock：透传 props 的普通组件 + 按
// numColumns 分行渲染 renderItem（保留 FlatList 式「renderItem 确实消费 data」的结构取证
// 能力，页面测试/virtualization 计数断言继续可用）。masonry 单列平铺即可（测试不验证分列）。
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockFlashList = (props: any) => {
    const { data, renderItem, numColumns = 1, ListHeaderComponent, ListFooterComponent } = props;
    // 取证挂钩：虚拟化/布局 props 挂 host 节点会被 react-test-renderer 丢弃，塞进
    // dataAttrs（testID 同节点）供测试断言（numColumns/masonry/drawDistance/data）
    const dataAttrs = {
      'data-num-columns': numColumns,
      'data-masonry': props.masonry === true ? 'true' : 'false',
      'data-draw-distance': String(props.drawDistance ?? ''),
      'data-count': data?.length ?? 0,
    };
    const rows = [];
    for (let i = 0; i < (data?.length ?? 0); i += numColumns) {
      const rowItems = data.slice(i, i + numColumns);
      rows.push(
        React.createElement(
          View,
          { key: `row-${i}` },
          rowItems.map((item: unknown, j: number) =>
            React.createElement(View, { key: `cell-${i + j}` }, renderItem({ item, index: i + j })),
          ),
        ),
      );
    }
    // ListHeader/Footer 支持组件引用与 element 两种形态：组件引用套 View 调用收敛
    // （页面 renderListHeader 返回 Fragment 多节点，直接当组件类型会以 View 形态误挂）；
    // element 原样保留。
    const asChild = (Comp: unknown, key: string) => {
      if (React.isValidElement(Comp))
        return React.cloneElement(Comp as React.ReactElement, { key });
      return React.createElement(View, { key }, React.createElement(Comp as React.FC));
    };
    const headerEl = ListHeaderComponent ? asChild(ListHeaderComponent, 'header') : null;
    const footerEl = ListFooterComponent ? asChild(ListFooterComponent, 'footer') : null;
    return React.createElement(
      View,
      { testID: props.testID ?? 'mock-flashlist', ...dataAttrs },
      [headerEl, ...rows, footerEl].filter(Boolean),
    );
  };
  return { __esModule: true, FlashList: MockFlashList };
});

// Mock react-native-reanimated（业务增强批3 3.5：商品详情页动画引入 reanimated 后的测试基建）。
// 官方 lib/module/mock.js 是 ESM（import 语法）jsdom 下 require 失败，且其内部 useSharedValue
// 依赖 Proxy，行为不完全等价——这里手写最小语义 mock：shared value 用普通对象，animated style
// 直接执行 styleBuilder 返回普通样式对象（jest 环境断言数值终态而非插值过程，语义等价）。
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const useSharedValue = (init: number) => {
    const ref = React.useRef({ value: init });
    return ref.current;
  };
  const useAnimatedStyle = (styleBuilder: () => Record<string, unknown>) => {
    // 依赖数组缺省（本仓只用单参形式）；直接求值一次——mock 下动画值不随帧变化，
    // 返回终态样式对象供 jest 断言（useAnimatedStyle 官方 mock 亦同语义）
    return React.useMemo(() => styleBuilder(), [styleBuilder]);
  };
  const useDerivedValue = (processor: () => unknown) => {
    const ref = React.useRef({ value: processor() });
    return ref.current;
  };
  const useAnimatedScrollHandler = () => ({}) as Record<string, unknown>;
  const withTiming = (toValue: number) => toValue;
  const withSpring = (toValue: number) => toValue;
  const withDelay = (_delay: number, animation: number) => animation;
  const withRepeat = (animation: number) => animation;
  const withSequence = (...animations: number[]) => animations[animations.length - 1];
  const cancelAnimation = () => {};
  const runOnJS = (fn: unknown) => fn;
  const Easing = {
    linear: (t: number) => t,
    ease: (t: number) => t,
    in: (e: (t: number) => number) => e,
    out: (e: (t: number) => number) => e,
    inOut: (e: (t: number) => number) => e,
    bezier: () => (t: number) => t,
  };
  const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' } as const;
  // Animated 组件：直接透传原组件（jsdom 下不做动画插值，渲染语义保持）
  const createAnimatedComponent = (Component: unknown) => Component as React.FC;
  const Animated = {
    // 原因：RN View 组件类型与 reanimated Animated 泛型签名宽窄不同，测试 mock 收窄无意义
    View: View as unknown as React.FC,
    createAnimatedComponent,
  };
  return {
    __esModule: true,
    default: Animated,
    Animated,
    createAnimatedComponent,
    useSharedValue,
    useAnimatedStyle,
    useDerivedValue,
    useAnimatedScrollHandler,
    useAnimatedRef: () => ({ current: null }),
    withTiming,
    withSpring,
    withDelay,
    withRepeat,
    withSequence,
    cancelAnimation,
    runOnJS,
    Easing,
    ReduceMotion,
  };
});
