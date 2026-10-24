/**
 * SafeImage toThumbUrl 单测（批3：对齐 client P3-2 图片扩展名守卫）
 *
 * rider-app SafeImage 无独立单测文件（此前仅 profile.test.tsx 间接覆盖渲染），
 * 守卫逻辑纯函数，直接断言映射规则与 client-app SafeImage.test.tsx 同款边界。
 */
import { toThumbUrl } from '../SafeImage';

describe('toThumbUrl（批3 对齐 client P3-2 守卫）', () => {
  it('图片扩展名前插入 -thumb（与后端 thumbKeyFor 同规则）', () => {
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
    expect(toThumbUrl('file:///var/photo.jpg')).toBe('file:///var/photo.jpg');
    expect(toThumbUrl('')).toBe('');
  });

  it('无扩展名 URL 原样返回（不尾追加，防必 404 白耗请求）', () => {
    expect(toThumbUrl('https://cdn.example.com/img')).toBe('https://cdn.example.com/img');
  });

  it('非图片扩展名/带 query 外链原样返回（不拼 -thumb，走 full）', () => {
    // 无扩展名 + query（unsplash 兜底图形态）
    expect(toThumbUrl('https://images.unsplash.com/photo-1?w=100')).toBe(
      'https://images.unsplash.com/photo-1?w=100',
    );
    // 非图片扩展名
    expect(toThumbUrl('https://cdn.example.com/page.html')).toBe(
      'https://cdn.example.com/page.html',
    );
    expect(toThumbUrl('https://cdn.example.com/icon.svg')).toBe('https://cdn.example.com/icon.svg');
    // 大写扩展名命中
    expect(toThumbUrl('https://cdn.example.com/a.PNG')).toBe('https://cdn.example.com/a-thumb.PNG');
    // 带 query 的图片扩展名不命中（守卫按完整 URI 尾部判定，保守走 full）
    expect(toThumbUrl('https://cdn.example.com/a.jpg?w=100')).toBe(
      'https://cdn.example.com/a.jpg?w=100',
    );
  });
});
