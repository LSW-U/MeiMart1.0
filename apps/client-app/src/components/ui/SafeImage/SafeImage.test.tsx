import React from 'react';
import { render, act } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { SafeImage } from './SafeImage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('SafeImage', () => {
  it('renders without crashing with { uri } source', () => {
    const { root } = render(
      <SafeImage source={{ uri: 'https://example.com/test.png' }} testID="safe-img" />,
      { wrapper },
    );
    expect(root).toBeTruthy();
  });

  it('renders without crashing with string source', () => {
    const { root } = render(<SafeImage source="https://example.com/x.png" />, { wrapper });
    expect(root).toBeTruthy();
  });

  it('renders without crashing when fallback provided', () => {
    const { root } = render(
      <SafeImage source={{ uri: 'https://example.com/x.png' }} fallback={<>{'占位'}</>} />,
      { wrapper },
    );
    expect(root).toBeTruthy();
  });

  // C-P2-3: 同实例切 uri 重置 hasError——第一张失败走占位后，换新 uri 应回到图片分支
  it('uri 变化重置 hasError（切图后退出失败态，可再次渲染 ExpoImage）', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <SafeImage source={{ uri: 'https://example.com/a.png' }} testID="safe-img" />,
      { wrapper },
    );
    // 第一张加载失败 → 失败态（ExpoImage 卸载，fallback View 挂 image-off 图标）
    act(() => {
      getByTestId('safe-img').props.onError({ nativeEvent: { error: 'mock' } });
    });
    expect(queryByTestId('safe-img')).toBeNull();

    // 同实例换新 uri → hasError 重置，ExpoImage 重新挂载（新 uri 生效）
    rerender(<SafeImage source={{ uri: 'https://example.com/b.png' }} testID="safe-img" />);
    expect(getByTestId('safe-img').props.source).toEqual([{ uri: 'https://example.com/b.png' }]);
  });
});
