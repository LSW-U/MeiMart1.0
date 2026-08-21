import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import { AuthShell } from '../AuthShell';

// AuthShell 现自取 t('about.subtitle')（P29 原型 brand-tag）——直渲染场景无 i18n 实例，mock 之
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

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

  it('renders compact brand identity — logo/name/tag/welcome/sub 五层（P29 原型 .brand-head）', () => {
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
    // brand-tag 复用 about.subtitle（「东帝汶本地生活超市」）
    expect(getByText('about.subtitle')).toBeTruthy();
    // P29-D2: 文化锚点区已删
    expect(queryByText('Loke Odamatan')).toBeNull();
  });

  it('renders action button as the primary CTA + locale bar（P29-D3/.locale-bar）', () => {
    const { getByRole, getByTestId } = wrap(
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
    // LocaleBar 三语言条
    expect(getByTestId('locale-bar-zh')).toBeTruthy();
    expect(getByTestId('locale-bar-en')).toBeTruthy();
    expect(getByTestId('locale-bar-tet')).toBeTruthy();
  });
});
