import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Chip } from './Chip';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Chip', () => {
  it('renders label', () => {
    const { getByText } = render(<Chip label="Fruits" selected={false} />, { wrapper });
    expect(getByText('Fruits')).toBeTruthy();
  });

  it('calls onSelect with next value when pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(<Chip label="Fruits" selected={false} onSelect={onSelect} />, {
      wrapper,
    });
    fireEvent.press(getByText('Fruits'));
    expect(onSelect).toHaveBeenCalledWith(true);
  });

  it('has checkbox role with checked state', () => {
    const { getByRole } = render(<Chip label="Veg" selected={true} />, { wrapper });
    const chip = getByRole('checkbox');
    expect(chip.props.accessibilityState.checked).toBe(true);
  });
});
