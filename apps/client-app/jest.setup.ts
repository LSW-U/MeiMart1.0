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
