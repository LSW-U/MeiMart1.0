import { useEffect, useState } from 'react';

/**
 * D7 批4（R-P3-7）：相对时间 tick hook——每 60s 翻转一次布尔值。
 *
 * Why hook 化：tick 只给消费相对时间的叶子组件用（NotificationTimeText），
 * 原实现在 notifications.tsx 页面级 setTick——每分钟整个通知列表（含图片/卡片）
 * 全量重渲染，只为刷新「x 分钟前」文案。抽到叶子组件后每分钟仅重渲 n 个
 * 时间 Text（几十字节的浅组件），列表其余部分 bail out。
 */
export function useMinuteTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return tick;
}
