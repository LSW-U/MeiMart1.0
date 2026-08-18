// openExternalLink 单测：成功透传 / 失败 toast（P20 审查 Q4）
import { toast } from '@/store/toastStore';
import { openExternalLink } from '../linking';

// Why: 不整替 react-native（jest-expo 壳会连带断其它导出），spy 真模块的 Linking.openURL
let openURLSpy: ReturnType<typeof jest.spyOn>;
let toastErrorSpy: ReturnType<typeof jest.spyOn>;

describe('openExternalLink', () => {
  beforeAll(() => {
    const { Linking } = jest.requireActual('react-native');
    openURLSpy = jest.spyOn(Linking, 'openURL');
  });

  beforeEach(() => {
    openURLSpy.mockReset();
    toastErrorSpy = jest.spyOn(toast, 'error');
  });

  afterEach(() => {
    toastErrorSpy.mockRestore();
  });

  it('openURL 成功：不弹 toast', async () => {
    openURLSpy.mockResolvedValue(undefined);
    openExternalLink('tel:+67077000000', 'Could not open');
    await Promise.resolve();
    expect(openURLSpy).toHaveBeenCalledWith('tel:+67077000000');
    expect(toastErrorSpy).not.toHaveBeenCalled();
  });

  it('openURL reject（无对应 App）：toast.error 提示传入文案', async () => {
    openURLSpy.mockRejectedValue(new Error('Unable to open URL'));
    openExternalLink('mailto:support@meimart.tl', 'Could not open the app');
    // catch 回调在微任务后执行
    await Promise.resolve().then(() => Promise.resolve());
    expect(toastErrorSpy).toHaveBeenCalledWith('Could not open the app');
  });
});
