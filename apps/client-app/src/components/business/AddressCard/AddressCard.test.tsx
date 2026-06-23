import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { AddressCard } from './AddressCard';
import type { Address } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const address: Address = {
  id: 'a1',
  name: 'Alice',
  phone: '+670 7777 7777',
  province: 'Dili',
  city: 'Dili',
  district: 'Vera Cruz',
  detail: 'Street 123, House 45',
  isDefault: true,
};

describe('AddressCard', () => {
  it('renders name, phone, and full address', () => {
    const { getByText } = render(<AddressCard address={address} />, { wrapper });
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('+670 7777 7777')).toBeTruthy();
    expect(getByText('DiliDiliVera CruzStreet 123, House 45')).toBeTruthy();
    expect(getByText('Default')).toBeTruthy();
  });

  it('calls onEdit when edit button pressed', () => {
    const onEdit = jest.fn();
    const { getByLabelText } = render(<AddressCard address={address} onEdit={onEdit} />, {
      wrapper,
    });
    fireEvent.press(getByLabelText('Edit address'));
    expect(onEdit).toHaveBeenCalledWith(address);
  });
});
