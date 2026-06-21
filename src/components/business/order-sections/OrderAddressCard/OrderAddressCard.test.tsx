import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { OrderAddressCard } from './OrderAddressCard';
import type { Address } from '@/types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const address: Address = {
  id: 'a1',
  name: 'João Silva',
  phone: '+670 7777 8888',
  province: 'Dili',
  city: 'Dili',
  district: 'Vera Cruz',
  detail: 'Rua dos Martires, No. 12',
  isDefault: true,
};

describe('OrderAddressCard', () => {
  it('renders name, phone and full address line', () => {
    const { getByText } = render(<OrderAddressCard address={address} />, { wrapper });
    expect(getByText('João Silva')).toBeTruthy();
    expect(getByText('+670 7777 8888')).toBeTruthy();
    expect(getByText('DiliDiliVera CruzRua dos Martires, No. 12')).toBeTruthy();
  });

  it('shows edit link and triggers onEdit', () => {
    const onEdit = jest.fn();
    const { getByText } = render(
      <OrderAddressCard address={address} onEdit={onEdit} editLabel="Change" />,
      { wrapper },
    );
    fireEvent.press(getByText('Change'));
    expect(onEdit).toHaveBeenCalled();
  });
});
