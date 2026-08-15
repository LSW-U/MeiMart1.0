/**
 * @jest-environment jsdom
 */
import { fireEvent, render } from '@testing-library/react';

import { QueryBoundary } from './QueryBoundary';

/**
 * QueryBoundary 组件单测 —— B3 三态统一（loading 骨架 / error 重试 / 空态 / render props）。
 *
 * web project（jsdom）+ RN host 壳（同 Button.test）。状态优先级：
 * loading > error(含 undefined 兜底) > empty > children。
 * Why Partial<Parameters<>> 会把泛型钉死 unknown，用 data: unknown[] 的显式默认 props。
 */

const retrySpy = jest.fn();
const childrenSpy = jest.fn((data: unknown[]) => <span data-testid="real-data">{data.length}</span>);

type TestProps = Partial<React.ComponentProps<typeof QueryBoundary<unknown[], unknown[]>>>;

function renderBoundary(props: TestProps = {}) {
  return render(
    <QueryBoundary<unknown[], unknown[]>
      data={[{ id: '1' }]}
      emptyTitle="暂无数据"
      errorMessage="请检查网络后重试"
      errorTitle="加载失败"
      isEmpty={(d) => d.length === 0}
      isLoading={false}
      retryLabel="重试"
      onRetry={retrySpy}
      {...props}
    >
      {childrenSpy}
    </QueryBoundary>,
  );
}

beforeEach(() => {
  retrySpy.mockClear();
  childrenSpy.mockClear();
});

describe('loading 态（优先级 1）', () => {
  it('渲染骨架，不渲染 children/empty/error', () => {
    const { queryByTestId } = renderBoundary({ isLoading: true, isError: false });
    expect(queryByTestId('query-skeleton')).not.toBeNull();
    expect(queryByTestId('query-empty')).toBeNull();
    expect(queryByTestId('query-error')).toBeNull();
    expect(childrenSpy).not.toHaveBeenCalled();
  });

  it('skeleton=list/detail/summary 均渲染骨架结构', () => {
    const { rerender, queryByTestId } = renderBoundary({ isLoading: true, skeleton: 'list' });
    expect(queryByTestId('query-skeleton')).not.toBeNull();
    for (const variant of ['detail', 'summary'] as const) {
      rerender(
        <QueryBoundary<unknown[], unknown[]>
          data={[1]}
          emptyTitle="t"
          errorMessage="m"
          errorTitle="e"
          isEmpty={() => false}
          isLoading
          retryLabel="r"
          skeleton={variant}
        >
          {childrenSpy}
        </QueryBoundary>,
      );
      expect(queryByTestId('query-skeleton')).not.toBeNull();
    }
  });
});

describe('error 态（优先级 2）', () => {
  it('isError=true 渲染 title/message/retry，不渲染 children', () => {
    const { getByText, queryByTestId } = renderBoundary({ isError: true });
    expect(getByText('加载失败')).toBeTruthy();
    expect(getByText('请检查网络后重试')).toBeTruthy();
    expect(queryByTestId('query-data')).toBeNull();
    expect(childrenSpy).not.toHaveBeenCalled();
  });

  it('点击 retry 调 onRetry', () => {
    const { getByText } = renderBoundary({ isError: true });
    fireEvent.click(getByText('重试'));
    expect(retrySpy).toHaveBeenCalledTimes(1);
  });

  it('data undefined 且非 loading：按 error 兜底', () => {
    const { getByText, queryByTestId } = renderBoundary({ data: undefined, isLoading: false });
    expect(getByText('加载失败')).toBeTruthy();
    expect(queryByTestId('query-data')).toBeNull();
  });

  it('error 容器 role=alert', () => {
    const { container } = renderBoundary({ isError: true });
    expect(container.querySelector('[data-rn-host="View"][data-prop-accessibilityrole="alert"]')).not.toBeNull();
  });
});

describe('empty 态（优先级 3）', () => {
  it('isEmpty=true 渲染空态文案，不渲染 children', () => {
    const { getByText, queryByTestId } = renderBoundary({ data: [] });
    expect(getByText('暂无数据')).toBeTruthy();
    expect(queryByTestId('query-data')).toBeNull();
    expect(childrenSpy).not.toHaveBeenCalled();
  });

  it('emptyDescription 可选渲染', () => {
    const { getByText } = renderBoundary({ data: [], emptyDescription: '附近暂无任务' });
    expect(getByText('附近暂无任务')).toBeTruthy();
  });
});

describe('data 态（优先级 4）', () => {
  it('children 收到窄化后的真实 data', () => {
    const data = [{ id: 'T1' }];
    renderBoundary({ data });
    expect(childrenSpy).toHaveBeenCalledTimes(1);
    expect(childrenSpy.mock.calls[0][0]).toEqual(data);
  });

  it('非 null 数据 JSX 自动推断（tasks 场景）', () => {
    const lists = { available: [{ id: 'a' }], pickups: [], deliveries: [] };
    const { queryByTestId } = render(
      <QueryBoundary
        data={lists}
        emptyTitle="暂无任务"
        errorMessage="m"
        errorTitle="e"
        isEmpty={(l) => l.available.length === 0 && l.pickups.length === 0 && l.deliveries.length === 0}
        isLoading={false}
        retryLabel="r"
      >
        {(l) => <span>{l.available[0]?.id}</span>}
      </QueryBoundary>,
    );
    expect(queryByTestId('query-data')).not.toBeNull();
  });

  it('null-able 数据显式泛型后 children 拿到非 null（detail 场景）', () => {
    const task = { id: 'T1', status: 'PICKED_UP' };
    const { queryByTestId } = render(
      <QueryBoundary<typeof task | null>
        data={task}
        emptyTitle="任务未找到"
        errorMessage="m"
        errorTitle="e"
        isEmpty={(v) => v === null}
        isLoading={false}
        retryLabel="r"
      >
        {(d) => <span>{d.status}</span>}
      </QueryBoundary>,
    );
    expect(queryByTestId('query-data')).not.toBeNull();
  });
});
