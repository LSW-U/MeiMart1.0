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

  it('renders brand identity', () => {
    const { getByText } = wrap(
      <AuthShell
        welcomeTitle="Welcome"
        welcomeSub="subtitle"
        actionLabel="Submit"
        onAction={() => {}}
      >
        <></>
      </AuthShell>,
    );
    expect(getByText('MEI MART')).toBeTruthy();
    expect(getByText('EST. 2024 • DILI')).toBeTruthy();
  });

  it('renders cultural anchor section', () => {
    const { getByText } = wrap(
      <AuthShell
        welcomeTitle="Welcome"
        welcomeSub="subtitle"
        actionLabel="Submit"
        onAction={() => {}}
      >
        <></>
      </AuthShell>,
    );
    expect(getByText('Loke Odamatan')).toBeTruthy();
    expect(getByText('Opening the doors to local quality.')).toBeTruthy();
  });
});
