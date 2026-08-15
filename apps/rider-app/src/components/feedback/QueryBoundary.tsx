import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

/**
 * QueryBoundary —— query 三态统一边界（B3）
 *
 * 状态优先级（方案 §3）：
 *   1. isLoading → 骨架（不显示空态、不渲染 children）
 *   2. isError || data === undefined → 错误 + 重试（请求状态 ≠ "不存在"）
 *   3. isEmpty(data) → 业务空态
 *   4. 其他 → render props 渲染真实数据（data 已窄化为 T）
 *
 * 约定：不自动 retry（弱网风暴）；error 与 not-found 必须由调用方区分文案；
 * 不吞页面结构——Empty/Error 都渲染在本组件容器内，页面 header/底栏不受影响。
 */
type QueryBoundaryProps<T, D> = {
  // useQuery 的 data 类型是 T | undefined（T 本身可含 null，如 DeliveryTask | null）
  data: T | undefined;
  isLoading: boolean;
  isError?: boolean;
  isEmpty: (data: NoInfer<T>) => boolean;
  errorTitle: string;
  errorMessage: string;
  retryLabel: string;
  emptyTitle: string;
  emptyDescription?: string;
  skeleton?: 'list' | 'detail' | 'summary';
  onRetry?: () => void;
  // Why: null-able 数据（如 DeliveryTask | null）经 isEmpty 拦截 null 后，children
  // 收到的应是非 null 数据。双泛型：T 由 data 推断（可含 null），D 为窄化后类型；
  // null-able 场景 JSX 自动推断受限，调用方写 <QueryBoundary<Foo | null>> 显式钉 T
  children: (data: D) => ReactNode;
};

/** 骨架布局变体（原型：list=2 张卡 / detail=大块+行 / summary=金额块+行） */
function QuerySkeleton({ variant }: { variant: 'list' | 'detail' | 'summary' }) {
  if (variant === 'summary') {
    return (
      <View testID="query-skeleton">
        <Skeleton className="h-19 w-full" />
        <Skeleton className="mt-2.5 h-3.5 w-3/5" />
      </View>
    );
  }
  if (variant === 'detail') {
    return (
      <View testID="query-skeleton">
        <Skeleton className="h-30 w-full" />
        <Skeleton className="mt-2.5 h-3.5 w-full" />
        <Skeleton className="mt-2.5 h-3.5 w-3/5" />
        <Skeleton className="mt-2.5 h-3.5 w-2/5" />
      </View>
    );
  }
  return (
    <View testID="query-skeleton">
      <Skeleton className="h-3.5 w-2/5" />
      <Skeleton className="mt-2.5 h-3.5 w-3/5" />
      <Skeleton className="mt-2.5 h-3.5 w-1/4" />
      <Skeleton className="mt-6 h-3.5 w-2/5" />
      <Skeleton className="mt-2.5 h-3.5 w-3/5" />
    </View>
  );
}

export function QueryBoundary<T, D = Exclude<T, null>>({
  data,
  isLoading,
  isError = false,
  isEmpty,
  errorTitle,
  errorMessage,
  retryLabel,
  emptyTitle,
  emptyDescription,
  skeleton = 'list',
  onRetry,
  children,
}: QueryBoundaryProps<T, D>) {
  // 1. loading：骨架优先，杜绝空态闪烁
  if (isLoading) {
    return <QuerySkeleton variant={skeleton} />;
  }

  // 2. 错误（含 data undefined 非 loading 的兜底）：请求状态 ≠ "不存在"
  if (isError || data === undefined) {
    return (
      <View accessibilityRole="alert" className="rounded-2xl border border-error/40 bg-surface p-4" testID="query-error">
        <Text className="text-sm font-extrabold text-error">{errorTitle}</Text>
        <Text className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">{errorMessage}</Text>
        {onRetry ? (
          <Button className="mt-3 h-9 self-start px-3.5" textClassName="text-xs" onPress={onRetry}>{retryLabel}</Button>
        ) : null}
      </View>
    );
  }

  // 3. 业务空态（基于真实 data 判断）
  if (isEmpty(data)) {
    return (
      <View className="items-center rounded-3xl bg-surface p-6" testID="query-empty">
        <Text className="text-lg font-bold text-on-surface">{emptyTitle}</Text>
        {emptyDescription ? <Text className="mt-2 text-center text-sm text-on-surface-variant">{emptyDescription}</Text> : null}
      </View>
    );
  }

  // 4. 真实数据（render props，null 已被 isEmpty 拦截，data 窄化为 D）
  return <View testID="query-data">{children(data as D)}</View>;
}
