import React from 'react';
import { render } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme';

import { LocationChip } from './LocationChip';

// Why: a11y 走 i18n（common.a11y.locationChip 模板插值），mock t 做简单插值（同 StatusBadge.test）
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const templates: Record<string, string> = {
        'common.a11y.locationChip': 'Location: {{location}}',
      };
      let s = templates[key] ?? key;
      if (opts) {
        Object.keys(opts).forEach((k) => {
          s = s.replace(new RegExp(`{{${k}}}`, 'g'), String(opts[k]));
        });
      }
      return s;
    },
  }),
}));

// useTheme 组件需 ThemeProvider 包裹（同 Card/Input/PriceText 测试先例）
const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('LocationChip', () => {
  it('renders label with i18n a11y label', () => {
    const { getByText, getByLabelText } = renderWithTheme(
      <LocationChip label="Dili" onPress={() => {}} />,
    );
    expect(getByText('Dili')).toBeTruthy();
    expect(getByLabelText('Location: Dili')).toBeTruthy();
  });

  it('renders without optional props', () => {
    const { getByText } = renderWithTheme(<LocationChip label="Manatuto" />);
    expect(getByText('Manatuto')).toBeTruthy();
  });
});
