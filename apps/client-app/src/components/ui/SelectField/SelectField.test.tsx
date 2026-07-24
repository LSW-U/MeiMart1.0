import React from 'react';
import { render } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { ThemeProvider } from '@/theme';
import { SelectField } from './SelectField';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('SelectField', () => {
  it('renders label and placeholder', () => {
    function Harness() {
      const { control } = useForm<{ country: string }>({ defaultValues: { country: '' } });
      return (
        <SelectField
          control={control}
          name="country"
          label="Country"
          icon="public"
          placeholder="Select country"
          options={['Timor-Leste', 'China']}
        />
      );
    }
    const { getByText } = render(<Harness />, { wrapper });
    expect(getByText('Country')).toBeTruthy();
    expect(getByText('Select country')).toBeTruthy();
  });
});
