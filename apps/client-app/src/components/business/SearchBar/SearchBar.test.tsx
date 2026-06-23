import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { SearchBar } from './SearchBar';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('SearchBar', () => {
  it('renders placeholder text', () => {
    const { getByPlaceholderText } = render(<SearchBar placeholder="Search products" />, {
      wrapper,
    });
    expect(getByPlaceholderText('Search products')).toBeTruthy();
  });

  it('supports controlled value and onChange', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchBar value="honey" placeholder="Search" onChange={onChange} />,
      { wrapper },
    );
    fireEvent.changeText(getByPlaceholderText('Search'), 'honey extra');
    expect(onChange).toHaveBeenCalledWith('honey extra');
  });

  it('calls onSearch on submit', () => {
    const onSearch = jest.fn();
    const { getByPlaceholderText } = render(
      <SearchBar defaultValue="coffee" placeholder="Search" onSearch={onSearch} />,
      { wrapper },
    );
    fireEvent(getByPlaceholderText('Search'), 'submitEditing');
    expect(onSearch).toHaveBeenCalledWith('coffee');
  });

  it('renders mic button when showMic is true', () => {
    const { getByLabelText } = render(<SearchBar showMic placeholder="Search" />, { wrapper });
    expect(getByLabelText('Voice search')).toBeTruthy();
  });

  it('renders embedded variant with translucent background', () => {
    const { toJSON } = render(<SearchBar variant="embedded" placeholder="Search" />, { wrapper });
    expect(toJSON()).not.toBeNull();
  });
});
