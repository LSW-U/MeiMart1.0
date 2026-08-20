import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { AuthShell } from '../AuthShell';

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('AuthShell', () => {
  it('renders welcome title, subtitle, and action label', () => {
    const { getByText } = wrap(
      <AuthShell
        welcomeTitle="Welcome Back"
        welcomeSub="Sign in to your account"
        actionLabel="Sign In"
        onAction={() => {}}
      >
        <></>
      </AuthShell>,
    );
    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Sign in to your account')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('renders compact brand identity (P29-D2: no cultural image / no fixed header)', () => {
    const { getByText, queryByText } = wrap(
      <AuthShell
        welcomeTitle="Welcome"
        welcomeSub="subtitle"
        actionLabel="Submit"
        onAction={() => {}}
      >
        <></>
      </AuthShell>,
    );
    expect(getByText('MeiMart')).toBeTruthy();
    expect(getByText('EST. 2024 • DILI')).toBeTruthy();
    // P29-D2: 文化锚点区已删，不再渲染
    expect(queryByText('Loke Odamatan')).toBeNull();
    expect(queryByText('Opening the doors to local quality.')).toBeNull();
  });

  it('renders action button as the primary CTA (P29-D3)', () => {
    const { getByRole } = wrap(
      <AuthShell
        welcomeTitle="Welcome"
        welcomeSub="subtitle"
        actionLabel="Sign In"
        onAction={() => {}}
      >
        <></>
      </AuthShell>,
    );
    const btn = getByRole('button', { name: 'Sign In' });
    expect(btn).toBeTruthy();
  });
});
