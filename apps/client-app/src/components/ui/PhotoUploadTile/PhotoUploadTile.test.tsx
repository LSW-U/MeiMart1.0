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
    const { getByText } = renderWithTheme(
      <PhotoUploadTile
        state="error"
        uri="file:///tmp/a.jpg"
        addA11yLabel="Add photo"
        errorKind="network"
        errorMessage="Upload failed"
        retryLabel="Retry"
        onRetry={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(getByText('Upload failed')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });
});
