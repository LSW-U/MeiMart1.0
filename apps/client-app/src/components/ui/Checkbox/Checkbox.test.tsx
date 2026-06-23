import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { Checkbox } from './Checkbox';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('Checkbox', () => {
  it('renders label', () => {
    const { getByText } = render(<Checkbox checked={false} label="Accept terms" />, { wrapper });
    expect(getByText('Accept terms')).toBeTruthy();
  });

  it('calls onChange with next value when pressed', () => {
    const onChange = jest.fn();
    const { getByRole } = render(<Checkbox checked={false} onChange={onChange} />, { wrapper });
    fireEvent.press(getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not call onChange when disabled', () => {
    const onChange = jest.fn();
    const { getByRole } = render(<Checkbox checked={false} onChange={onChange} disabled />, {
      wrapper,
    });
    fireEvent.press(getByRole('checkbox'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reflects checked state in a11y', () => {
    const { getByRole } = render(<Checkbox checked={true} />, { wrapper });
    expect(getByRole('checkbox').props.accessibilityState.checked).toBe(true);
  });
});
