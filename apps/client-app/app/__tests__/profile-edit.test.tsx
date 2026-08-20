/**
 * ProfileEditPage（app/profile/edit.tsx）渲染测试（P27，规则 8）
 *
 * 验证 P27 优化点：头像区（相机角标 + 更换提示）、手机号只读行（lock + phoneLocked 副文案 +
 * 客服跳转）、保存按钮 label 走 profileEdit.save、schema max 15（D5）。
 * mock useProfile/useUpdateProfile + expo-image-picker（不真拉相册）。
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { router as expoRouter } from 'expo-router';
import { ThemeProvider } from '@/theme';
import { profileEditSchema } from '@/forms/schemas/user';
import EditPage from '../profile/edit';

const mockMutate = jest.fn();
const mockMutateAsync = jest.fn();

const fakeUser = {
  id: 'u1',
  name: 'Anna Costa',
  phone: '+670 7123 4567',
  email: 'anna@example.com',
  avatar: 'https://images.unsplash.com/photo-x?w=200',
};

// mock 工厂内联 jest.fn()（外层 const 在工厂求值时处 TDZ——P25 实测坑）
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

jest.mock('@/services/queries/useUser', () => ({
  useProfile: () => ({ data: fakeUser }),
  useUpdateProfile: () => ({ mutate: mockMutate, mutateAsync: mockMutateAsync, isPending: false }),
  PROFILE_QUERY_KEY: ['user', 'profile'],
}));

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({
    getQueryData: jest.fn(() => fakeUser),
    setQueryData: jest.fn(),
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ProfileEditPage（P27）', () => {
  const mockPush = jest.mocked(expoRouter.push);

  beforeEach(() => {
    mockMutate.mockClear();
    mockMutateAsync.mockClear();
    mockPush.mockClear();
  });

  it('头像区 + 行式卡渲染：相机角标提示 / section 标题 / 手机号只读行 / 保存 label', () => {
    const { getByText, getAllByText, getByTestId } = render(<EditPage />, { wrapper });
    expect(getByTestId('edit-avatar')).toBeTruthy();
    expect(getByText('profileEdit.avatarHint')).toBeTruthy();
    expect(getByText('profileEdit.sectionBasic')).toBeTruthy();
    expect(getByText('profileEdit.sectionAccount')).toBeTruthy();
    // 手机号只读：头像区展示 + 账号安全行两处出现（getAllByText）
    expect(getAllByText('+670 7123 4567').length).toBeGreaterThanOrEqual(2);
    expect(getByText('profileEdit.phoneLocked')).toBeTruthy();
    // F7：禁用态保存按钮 label 走 noChanges（未 dirty 时 isDirty=false）
    expect(getByText('profileEdit.noChanges')).toBeTruthy();
    // 字数计数（D5）：初始 10/15
    expect(getByText('10/15')).toBeTruthy();
  });

  it('F7：头像格式提示行 avatarFormat 渲染', () => {
    const { getByText } = render(<EditPage />, { wrapper });
    expect(getByText('profileEdit.avatarFormat')).toBeTruthy();
  });

  it('客服提示行跳 /(main)/service（D2：改号本期不接，只读+跳客服）', () => {
    const { getByTestId } = render(<EditPage />, { wrapper });
    fireEvent.press(getByTestId('edit-contact-support'));
    expect(mockPush).toHaveBeenCalledWith('/(main)/service');
  });

  it('schema max 15：16 字符昵称校验失败（D5）', () => {
    const result = profileEditSchema.safeParse({
      name: 'A'.repeat(16),
      phone: '+67077123456',
      email: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('profileEdit.nameTooLong');
    }
    // 15 字符通过
    const ok = profileEditSchema.safeParse({
      name: 'A'.repeat(15),
      phone: '+67077123456',
      email: '',
    });
    expect(ok.success).toBe(true);
  });

  it('schema 错误信息是 i18n key（D4）：nameRequired / emailInvalid', () => {
    const result = profileEditSchema.safeParse({ name: '', phone: '+670 77123456', email: 'bad' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('profileEdit.nameRequired');
      expect(messages).toContain('profileEdit.emailInvalid');
    }
  });
});
