import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Modal } from './Modal';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Modal', () => {
  it('renders children when visible', () => {
    const { getByText } = render(
      <Modal visible={true}>
        <Text>Modal content</Text>
      </Modal>,
      { wrapper },
    );
    expect(getByText('Modal content')).toBeTruthy();
  });

  it('does not render content when not visible', () => {
    const { queryByText } = render(
      <Modal visible={false}>
        <Text>Hidden</Text>
      </Modal>,
      { wrapper },
    );
    expect(queryByText('Hidden')).toBeNull();
  });

  it('renders title in header', () => {
    const { getByText } = render(
      <Modal visible={true} title="Confirm">
        <Text>Body</Text>
      </Modal>,
      { wrapper },
    );
    expect(getByText('Confirm')).toBeTruthy();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <Modal visible={true} title="Confirm" onClose={onClose}>
        <Text>Body</Text>
      </Modal>,
      { wrapper },
    );
    fireEvent.press(getByLabelText('common.close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
