/** 批4（rider web project）：@react-native-community/netinfo 桩
 *
 * 背景：批4 后 rider api.ts 改 import @meimart/api-core barrel，而 barrel 同时
 * re-export 批3 的 trackingSocket（顶层 import NetInfo，jsdom 无原生宿主 →
 * "Cannot read properties of undefined (reading 'RNCNetInfo')" 崩 21 个页面测试套件）。
 * api-core 自己的单测是 jest.mock 注入；端侧 jsdom 走本文件最小桩。
 * 本桩只服务模块加载（不被 http 层消费）；若未来 rider 页面测试需断言网络状态，
 * 再升级为可控 __setIsConnected 形态（对齐 expo-*.mock.js 惯例）。
 */
const NetInfo = {
  addEventListener: () => () => {},
  fetch: async () => ({ isConnected: true, isInternetReachable: true, type: 'wifi' }),
  configure: () => {},
};

module.exports = { default: NetInfo, ...NetInfo };
