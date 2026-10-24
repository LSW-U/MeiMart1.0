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

  // ── 批2（轻量化省流）variant="thumb" + toThumbUrl ──

  describe('toThumbUrl', () => {
    it('扩展名前插入 -thumb（与后端 thumbKeyFor 同规则）', () => {
      const { toThumbUrl } = require('./SafeImage');
      expect(toThumbUrl('http://localhost:9000/meimart/products/a.jpg')).toBe(
        'http://localhost:9000/meimart/products/a-thumb.jpg',
      );
      expect(toThumbUrl('https://cdn.example.com/x/y.png')).toBe(
        'https://cdn.example.com/x/y-thumb.png',
      );
      expect(toThumbUrl('https://cdn.example.com/x/y.webp')).toBe(
        'https://cdn.example.com/x/y-thumb.webp',
      );
    });

    it('非 http(s) 本地 URI（file:// 相机预览）原样返回', () => {
      const { toThumbUrl } = require('./SafeImage');
      expect(toThumbUrl('file:///var/photo.jpg')).toBe('file:///var/photo.jpg');
      expect(toThumbUrl('')).toBe('');
    });

    // P3-2 后无扩展名 URL 不再尾追加（旧行为会拼 img-thumb 必 404 白耗请求），走 full
    it('无扩展名 URL 原样返回（P3-2 守卫，不再尾追加）', () => {
      const { toThumbUrl } = require('./SafeImage');
      expect(toThumbUrl('https://cdn.example.com/img')).toBe('https://cdn.example.com/img');
    });

    // P3-2（批2 审查）：非图片扩展名/无扩展名外链不拼 -thumb（白耗一次 404 请求），走 full
    it('非图片扩展名/带 query 外链原样返回（不拼 -thumb）', () => {
      const { toThumbUrl } = require('./SafeImage');
      // review.tsx 兜底图同款形态：无扩展名 + query
      expect(toThumbUrl('https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=100')).toBe(
        'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=100',
      );
      // 非图片扩展名（如 .html/.svg）
      expect(toThumbUrl('https://cdn.example.com/page.html')).toBe(
        'https://cdn.example.com/page.html',
      );
      expect(toThumbUrl('https://cdn.example.com/icon.svg')).toBe(
        'https://cdn.example.com/icon.svg',
      );
      // 大写扩展名命中
      expect(toThumbUrl('https://cdn.example.com/a.PNG')).toBe(
        'https://cdn.example.com/a-thumb.PNG',
      );
      // 带 query 的图片扩展名不命中（守卫按完整 URI 尾部判定，走 full 保守）
      expect(toThumbUrl('https://cdn.example.com/a.jpg?w=100')).toBe(
        'https://cdn.example.com/a.jpg?w=100',
      );
    });
  });

  describe('variant="thumb"', () => {
    it('默认加载 -thumb URL（渲染 source 为缩略图地址）', () => {
      const { getByTestId } = render(
        <SafeImage
          source={{ uri: 'http://s:9000/b/products/a.jpg' }}
          variant="thumb"
          testID="safe-img"
        />,
        { wrapper },
      );
      expect(getByTestId('safe-img').props.source).toEqual([
        { uri: 'http://s:9000/b/products/a-thumb.jpg' },
      ]);
    });

    it('thumb 加载失败 → 回退原图（fallback-to-full，不直接进占位）', () => {
      const { getByTestId, rerender } = render(
        <SafeImage
          source={{ uri: 'http://s:9000/b/products/a.jpg' }}
          variant="thumb"
          testID="safe-img"
        />,
        { wrapper },
      );
      // thumb 404 → onError → 换原图 URI 重试（仍在图片分支）
      act(() => {
        getByTestId('safe-img').props.onError({ nativeEvent: { error: '404' } });
      });
      expect(getByTestId('safe-img').props.source).toEqual([
        { uri: 'http://s:9000/b/products/a.jpg' },
      ]);

      // 原图也失败 → 进占位态
      act(() => {
        getByTestId('safe-img').props.onError({ nativeEvent: { error: '404' } });
      });
      expect(() => getByTestId('safe-img')).toThrow();
    });

    it('variant=full（默认）失败直接进占位（既有行为不回归）', () => {
      const { getByTestId, queryByTestId } = render(
        <SafeImage source={{ uri: 'https://example.com/a.png' }} testID="safe-img" />,
        { wrapper },
      );
      act(() => {
        getByTestId('safe-img').props.onError({ nativeEvent: { error: 'mock' } });
      });
      expect(queryByTestId('safe-img')).toBeNull();
    });

    it('调用方自有 onError 不被吞（thumb 回退耗尽后触发）', () => {
      const callerOnError = jest.fn();
      const { getByTestId } = render(
        <SafeImage
          source={{ uri: 'http://s:9000/b/a.jpg' }}
          variant="thumb"
          onError={callerOnError}
          testID="safe-img"
        />,
        { wrapper },
      );
      // 第一次（thumb 失败）只回退不透传
      act(() => {
        getByTestId('safe-img').props.onError({ nativeEvent: { error: '404' } });
      });
      expect(callerOnError).not.toHaveBeenCalled();
      // 第二次（原图也失败）透传
      act(() => {
        getByTestId('safe-img').props.onError({ nativeEvent: { error: 'x' } });
      });
      expect(callerOnError).toHaveBeenCalledTimes(1);
    });

    it('lazy=true → priority=low + loading=lazy 透传 expo-image', () => {
      const { getByTestId } = render(
        <SafeImage source={{ uri: 'https://example.com/a.png' }} lazy testID="safe-img" />,
        { wrapper },
      );
      expect(getByTestId('safe-img').props.priority).toBe('low');
      expect(getByTestId('safe-img').props.loading).toBe('lazy');
    });

    it('recyclingKey / priority 显式传值透传', () => {
      const { getByTestId } = render(
        <SafeImage
          source={{ uri: 'https://example.com/a.png' }}
          recyclingKey="item-1"
          priority="high"
          testID="safe-img"
        />,
        { wrapper },
      );
      expect(getByTestId('safe-img').props.recyclingKey).toBe('item-1');
      expect(getByTestId('safe-img').props.priority).toBe('high');
    });
  });
});
