/**
 * @jest-environment jsdom
 */
/**
 * F3/§4（20261117 立项）：ReportIssueDialog 单测。
 * 模式对齐 memory `rider-rn-component-test-mock`：jsdom + RN mock 壳（src/test/react-native.mock.js），
 * 不放行真 react-native（NativeModule 会炸）。聚焦纯逻辑：noteRequired 校验 + reason 子集渲染 + 提交 payload。
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { showToast } from '../../../src/components/feedback/Toast';
import { ReportIssueDialog } from '../../../src/components/feedback/ReportIssueDialog';

// 对齐 deposit-pay.test.tsx：工厂内 jest.fn()：工厂内 jest.fn()（jest.mock 提升，外部 const 初始化晚于工厂
// 执行 → 工厂里引用 mockShowToast 是 undefined 导致 showToast not a function 实证）
jest.mock('../../../src/components/feedback/Toast', () => ({ showToast: jest.fn() }));

const mockTaskEvidence = jest.fn();
jest.mock('../../../src/services/upload', () => ({
  riderUploadApi: { taskEvidence: (...args: unknown[]) => mockTaskEvidence(...args) },
}));

jest.mock('../../../src/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      // zh 字典直读（页面相对 i18n 模式，memory client-app-rntl-test-techniques）
      const dict = require('../../../src/i18n/locales/zh.json');
      let out: string = dict[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v));
      return out;
    },
    language: 'zh',
  }),
  // TranslationKey 仅类型导入，运行时占位
  TranslationKey: {},
}));

const mockShowToast = showToast as jest.Mock;

describe('ReportIssueDialog（F3/§4）', () => {
  beforeEach(() => {
    mockShowToast.mockClear();
    mockTaskEvidence.mockReset();
  });

  function setup(overrides?: Partial<Parameters<typeof ReportIssueDialog>[0]>) {
    const onSubmit = jest.fn();
    const props = {
      visible: true,
      reasons: ['ORDER_CANCELLED'] as const,
      noteRequired: false,
      onSubmit,
      submitting: false,
      onDismiss: jest.fn(),
      ...overrides,
    };
    render(<ReportIssueDialog {...props} />);
    return { onSubmit };
  }

  it('渲染原因子集 chips（F3 单值）+ 标题', () => {
    setup();
    expect(screen.getByText('上报异常')).toBeTruthy();
    expect(screen.getByText('订单已取消，货在骑手手上')).toBeTruthy(); // reason chip = tasks.issue.reason.ORDER_CANCELLED
  });

  it('noteRequired=false：空备注可直接提交（note 为 undefined）', () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByText('提交'));
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledWith({ reason: 'ORDER_CANCELLED', note: undefined });
  });

  it('§4 noteRequired=true：空备注 toast 拦下不提交', () => {
    const { onSubmit } = setup({
      reasons: ['DEADLINE_OVERDUE_RETURN'] as const,
      noteRequired: true,
    });
    fireEvent.click(screen.getByText('提交'));
    expect(mockShowToast).toHaveBeenCalledWith('请填写备注说明情况', 'error');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('§4 noteRequired=true：有备注正常提交（trim 后随 body）', () => {
    const { onSubmit } = setup({
      reasons: ['DEADLINE_OVERDUE_RETURN'] as const,
      noteRequired: true,
    });
    // host 壳经 __fnProps 透传 onChangeText（对齐 edit.test.tsx 模式；多行 TextInput=textarea 不适用 RN mock）
    const input = document.querySelector('[data-rn-host="TextInput"]') as unknown as {
      __fnProps: { onChangeText: (v: string) => void };
    };
    act(() => {
      input.__fnProps.onChangeText('  超时返仓说明  ');
    });
    fireEvent.click(screen.getByText('提交'));
    expect(onSubmit).toHaveBeenCalledWith({
      reason: 'DEADLINE_OVERDUE_RETURN',
      note: '超时返仓说明',
    });
  });
});
