import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeImage } from './SafeImage';

describe('SafeImage', () => {
  it('renders without crashing with { uri } source', () => {
    const { root } = render(
      <SafeImage source={{ uri: 'https://example.com/test.png' }} testID="safe-img" />,
    );
    expect(root).toBeTruthy();
  });

  it('renders without crashing with string source', () => {
    const { root } = render(<SafeImage source="https://example.com/x.png" />);
    expect(root).toBeTruthy();
  });

  it('renders without crashing when fallback provided', () => {
    const { root } = render(
      <SafeImage source={{ uri: 'https://example.com/x.png' }} fallback={<>{'占位'}</>} />,
    );
    expect(root).toBeTruthy();
  });
});
