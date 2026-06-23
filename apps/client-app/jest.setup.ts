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
