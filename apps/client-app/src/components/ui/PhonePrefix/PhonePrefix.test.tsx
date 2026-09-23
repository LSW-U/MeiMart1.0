/**
 * PhonePrefix 测试（批A2-3 任务书#1）
 *
 * 关键路径：渲染 +670 文本 + 分隔线；自定义 code 透传
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { PhonePrefix, PHONE_PREFIX } from './PhonePrefix';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('PhonePrefix', () => {
  it('渲染默认 +670 前缀与分隔线', () => {
    const { getByText, UNSAFE_getAllByType } = render(<PhonePrefix />, { wrapper });
    expect(getByText('+670')).toBeTruthy();
    // 分隔线 View 存在（wrap 内 2 个节点：text + divider）
    const { View } = require('react-native');
    expect(UNSAFE_getAllByType(View).length).toBeGreaterThanOrEqual(2);
  });

  it('PHONE_PREFIX 常量导出与默认渲染一致（4 个 auth 页引用此常量）', () => {
    expect(PHONE_PREFIX).toBe('+670');
  });

  it('自定义 code 透传（扩展位：多国化时不改组件）', () => {
    const { getByText } = render(<PhonePrefix code="+86" />, { wrapper });
    expect(getByText('+86')).toBeTruthy();
  });
});
