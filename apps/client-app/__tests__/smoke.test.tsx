import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

describe('Jest setup smoke test', () => {
  it('renders text correctly', () => {
    const { getByText } = render(
      <View>
        <Text>Hello MeiMart</Text>
      </View>,
    );
    expect(getByText('Hello MeiMart')).toBeTruthy();
  });
});
