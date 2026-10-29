import React from 'react';
import { render } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import { PhotoUploadTile } from './PhotoUploadTile';

// Why: a11y 兜底走 i18n，mock t 返回 key（组件保持纯展示，测试传显式 label 时不依赖模板）
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// useTheme 组件需 ThemeProvider 包裹（同 Card/Input/Icon 测试先例）
const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

// 审查批C 规则 8 缺口补齐：组件预存无测试，本批触碰（P2-32 scrim）顺手闭环
describe('PhotoUploadTile', () => {
  it('renders empty state with add button and label', () => {
    const { getByLabelText, getByText } = renderWithTheme(
      <PhotoUploadTile onAdd={() => {}} addLabel="添加照片" addA11yLabel="Add photo" />,
    );
    expect(getByLabelText('Add photo')).toBeTruthy();
    expect(getByText('添加照片')).toBeTruthy();
  });

  it('renders done state with delete button', () => {
    const { getByLabelText } = renderWithTheme(
      <PhotoUploadTile
        state="done"
        uri="file:///tmp/a.jpg"
        addA11yLabel="Add photo"
        onDelete={() => {}}
        deleteA11yLabel="Delete photo"
      />,
    );
    expect(getByLabelText('Delete photo')).toBeTruthy();
  });

  it('renders error state with message and retry', () => {
    // R2 批2 补强（fake-green 基线退出）：错误态断言从纯 toBeTruthy 扩为
    //   「错误文案渲染 + 重试钮（network 态专属）+ 删除钮仍在 + a11y 语义」，
    //   并负向断言 network 态不该出现的添加钮不存在（state 翻转才渲染）。
    const { getByText, getByLabelText, queryByLabelText } = renderWithTheme(
      <PhotoUploadTile
        state="error"
        uri="file:///tmp/a.jpg"
        addA11yLabel="Add photo"
        errorKind="network"
        errorMessage="Upload failed"
        retryLabel="Retry"
        retryA11yLabel="Retry upload"
        onRetry={() => {}}
        onDelete={() => {}}
        deleteA11yLabel="Delete photo"
      />,
    );
    expect(getByText('Upload failed')).toBeTruthy();
    expect(getByLabelText('Retry upload')).toBeTruthy();
    expect(getByLabelText('Delete photo')).toBeTruthy();
    // 负向：error 态不渲染「添加」入口（仅 empty 态有）
    expect(queryByLabelText('Add photo')).toBeNull();
    // 负向：错误文案非空（errorMessage 透传，空串渲染空 <Text> 也算失败）
    expect(getByText('Upload failed').props.children).toBe('Upload failed');
    // 负向：错误文案 numberOfLines=2（错误区两行截断防长文案撑爆贴片，批2 P3-3 审查注记）
    expect(getByText('Upload failed').props.numberOfLines).toBe(2);
  });
});
