// P22 反馈页测试：类型网格选中/取消 + D4 提交 disabled 逻辑 + D5 成功态 + D3 照片上传/删除/离线提示
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
// toast 句柄（断言 info 调用；jest.mock hoist 后拿到的是 mock 版）
import { toast } from '@/store/toastStore';
import * as ImagePicker from 'expo-image-picker';
import { uploadsApi } from '@/services/uploads';
import FeedbackPage from '../feedback';

// Why: mock t 直返 key（结构断言）；带插值参数时拼 key:count:max 便于断言计数文本
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; max?: number }) => {
      if (opts && ('count' in opts || 'max' in opts)) {
        return `${key}:${opts.count ?? ''}:${opts.max ?? ''}`;
      }
      return key;
    },
  }),
}));

jest.mock('@/hooks/useSafeBack', () => ({
  useSafeBack: () => jest.fn(),
}));

// 离线开关（变量名 mock 前缀满足 jest.mock hoist 引用规则）
let mockOffline = false;
jest.mock('@/hooks/useNetwork', () => ({
  useNetwork: () => ({ isOffline: mockOffline }),
}));

jest.mock('@/services/uploads', () => ({
  uploadsApi: { reviewImage: jest.fn() },
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('@/store/toastStore', () => ({
  toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

// photoCount Text 含 ` · ` 前缀拼接（label 行内），用正则尾部匹配（RNTL matcher 仅支持 string/RegExp）
const byPhotoCount = (count: number) =>
  new RegExp(`service\\.feedback\\.photoCount:${count}:3$`);

const pickType = (q: ReturnType<typeof render>) =>
  fireEvent.press(q.getByTestId('feedback-type-product'));

const fillContent = (q: ReturnType<typeof render>, len = 12) =>
  fireEvent.changeText(q.getByTestId('feedback-content'), 'x'.repeat(len));

describe('FeedbackPage（P22：一体化表单 + 类型网格 + 照片上传 + 成功态）', () => {
  beforeEach(() => {
    (toast.info as jest.Mock).mockClear();
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockReset();
    (uploadsApi.reviewImage as jest.Mock).mockReset();
    mockOffline = false;
  });

  it('渲染 6 个类型网格 cell + 提交按钮默认 disabled + 照片计数 0/3', () => {
    const { getByTestId, getByText } = render(<FeedbackPage />, { wrapper });
    ['feature', 'product', 'order', 'payment', 'shipping', 'other'].forEach((id) => {
      expect(getByTestId(`feedback-type-${id}`)).toBeTruthy();
    });
    expect(getByTestId('feedback-submit').props.accessibilityState?.disabled).toBe(true);
    // mock t 插值格式 key:count:max（trim 匹配，绕过 ` · ` 前缀）
    expect(getByText(byPhotoCount(0))).toBeTruthy();
    expect(getByTestId('feedback-add-photo')).toBeTruthy();
  });

  it('D2 类型选中/取消：点 product checked=true，再点回到 false', () => {
    const { getByTestId } = render(<FeedbackPage />, { wrapper });
    pickType({ getByTestId } as ReturnType<typeof render>);
    expect(getByTestId('feedback-type-product').props.accessibilityState?.checked).toBe(true);
    fireEvent.press(getByTestId('feedback-type-product'));
    expect(getByTestId('feedback-type-product').props.accessibilityState?.checked).toBe(false);
  });

  it('D4 智能 disabled：类型+内容(≥10)才可点；仅内容不可点；仅类型不可点', () => {
    const { getByTestId } = render(<FeedbackPage />, { wrapper });
    // 仅内容
    fillContent({ getByTestId } as ReturnType<typeof render>);
    expect(getByTestId('feedback-submit').props.accessibilityState?.disabled).toBe(true);
    // 补选类型 → 可点
    pickType({ getByTestId } as ReturnType<typeof render>);
    expect(getByTestId('feedback-submit').props.accessibilityState?.disabled).toBe(false);
    // 内容清空（仅类型）→ 不可点
    fireEvent.changeText(getByTestId('feedback-content'), 'short');
    expect(getByTestId('feedback-submit').props.accessibilityState?.disabled).toBe(true);
  });

  it('D5 成功态：有效表单提交后显示成功页 + 返回按钮，表单区隐藏', async () => {
    const { getByTestId, queryByTestId } = render(<FeedbackPage />, { wrapper });
    pickType({ getByTestId } as ReturnType<typeof render>);
    fillContent({ getByTestId } as ReturnType<typeof render>);
    fireEvent.press(getByTestId('feedback-submit'));
    await waitFor(() => {
      expect(getByTestId('feedback-back-to-settings')).toBeTruthy();
      expect(queryByTestId('feedback-content')).toBeNull();
      expect(queryByTestId('feedback-submit')).toBeNull();
    });
  });

  it('D3 照片上传：选 1 张传 reviewImage 后计数 1/3 + 删除钮出现，删除后回到 0/3', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo1.jpg', mimeType: 'image/jpeg' }],
    });
    (uploadsApi.reviewImage as jest.Mock).mockResolvedValue({
      url: 'https://mock-minio.local/1.jpg',
      key: 'reviews/1.jpg',
      size: 1024,
    });
    const { getByTestId, getByText, queryByText } = render(<FeedbackPage />, { wrapper });
    fireEvent.press(getByTestId('feedback-add-photo'));
    await waitFor(() => {
      expect(getByText(byPhotoCount(1))).toBeTruthy();
      expect(getByTestId('feedback-remove-photo-0')).toBeTruthy();
    });
    expect(uploadsApi.reviewImage).toHaveBeenCalledWith('file://photo1.jpg', 'image/jpeg');
    fireEvent.press(getByTestId('feedback-remove-photo-0'));
    await waitFor(() => {
      expect(queryByText(byPhotoCount(1))).toBeNull();
      expect(getByText(byPhotoCount(0))).toBeTruthy();
    });
  });

  it('D3 上传失败：reviewImage reject 时 toast.error(uploadFailed)', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://photo2.jpg', mimeType: 'image/jpeg' }],
    });
    (uploadsApi.reviewImage as jest.Mock).mockRejectedValue(new Error('boom'));
    const { getByTestId } = render(<FeedbackPage />, { wrapper });
    fireEvent.press(getByTestId('feedback-add-photo'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('service.feedback.uploadFailed');
    });
  });

  it('弱网规则：离线时点添加被阻止并 toast.info(photoOfflineTip)，不调 ImagePicker', () => {
    mockOffline = true;
    const { getByTestId } = render(<FeedbackPage />, { wrapper });
    fireEvent.press(getByTestId('feedback-add-photo'));
    expect(toast.info).toHaveBeenCalledWith('service.feedback.photoOfflineTip');
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });
});
