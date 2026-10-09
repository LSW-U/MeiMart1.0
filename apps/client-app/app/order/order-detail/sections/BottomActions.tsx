// 状态切换的底部按钮（HTML 只画了 processing/shipped/delivered 三个状态，
// pending/cancelled/refunding 保留业务必须的按钮）
// 批5 拆分：从 app/order/[id].tsx 原样搬移（含 handleRepeatOrder），行为零变更
import { Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useTheme, borderRadius, shadowPresets } from '@/theme';
// C-P3-5（批4）：再买/复购真实加购
import { useAddToCart } from '@/services/queries/useCart';
// C-P3-4（批4）：待支付订单原位支付（不走 checkout）
import { paymentApi } from '@/services/payment';
import { toast } from '@/store/toastStore';
import type { OrderStatus, Order } from '@/types';
import { ON_PRIMARY } from '../shared';

// C-P3-5（批4）：订单再买/复购——按原订单 items 逐个真实加购（复用 useAddToCart mutation，
// 库存校验/乐观更新/invalidate 全在 hook 层），成功后跳购物车；部分失败 toast 提示实际加购数。
// Why: 原实现仅 router.replace('/(main)/home')，用户还要手动找回商品再加购，语义是「逛逛」非「再买」。
async function handleRepeatOrder(
  order: Order,
  ctx: {
    addToCart: ReturnType<typeof useAddToCart>;
    t: TFunction;
    toast: typeof toast;
  },
) {
  const items = order.items ?? [];
  if (items.length === 0) {
    ctx.toast.info(ctx.t('order.repeatEmpty', { defaultValue: 'No items to repeat' }));
    return;
  }
  let ok = 0;
  for (const item of items) {
    try {
      await ctx.addToCart.mutateAsync({ product: item.product, quantity: item.quantity });
      ok += 1;
    } catch {
      // 单项失败（断货/超限）继续加其余项，最后统一提示
    }
  }
  if (ok === 0) {
    ctx.toast.error(ctx.t('order.repeatFailed', { defaultValue: 'Failed to add items to cart' }));
    return;
  }
  if (ok < items.length) {
    ctx.toast.info(
      ctx.t('order.repeatPartial', {
        defaultValue: 'Some items added ({{ok}}/{{total}})',
        ok,
        total: items.length,
      }),
    );
  }
  router.push('/(main)/cart');
}

export function BottomActions({
  status,
  order,
  onCancel,
}: {
  status: OrderStatus;
  order: Order;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // C-P3-5（批4）：再买/复购真实加购（hook 层含库存校验 SOLD_OUT/STOCK_EXCEEDED + 乐观更新）
  const addToCart = useAddToCart();
  // N-P2-11（D6）：useRef 同步锁——连点支付/复购同帧多次触发时仅首击生效
  //（state 异步守卫拦不住同帧双击；对齐仓内其它提交点 ref 锁惯例）
  const payLockRef = useRef(false);
  const repeatLockRef = useRef(false);
  // N-P2-1（D6 第二层）：pending disabled——pay/repeat 进行中按钮置 disabled，
  // 视觉可达性双保险（ref 锁管同帧连点，disabled 管挂起期重复点击）
  const [payPending, setPayPending] = useState(false);
  const [repeatPending, setRepeatPending] = useState(false);
  // C-P3-4（批4）：待支付订单原位支付——预付渠道走 paymentApi（查 intent → dev mock 支付+确认，
  // 真实支付渠道接入前 dev 便利链路；prod 后端支付网关就绪后此处换真实收银台），COD 无需支付。
  // 失败 toast 不跳页，不经 checkout（不带入购物车与新建地址，杜绝重复下单路径）。
  // 挂账：真实支付渠道收银台 UI（需产品拍板渠道范围），当前 dev 链路仅验证状态流转。
  const handlePay = async () => {
    if (payLockRef.current) return;
    payLockRef.current = true;
    setPayPending(true);
    try {
      const method = (order.paymentMethod ?? 'COD').toUpperCase();
      if (method === 'COD') {
        // COD 无预付动作（骑手端货到收款），提示语义而非静默无响应
        toast.info(t('order.payCodNoAction', { defaultValue: 'COD orders are paid on delivery' }));
        return;
      }
      const intent = await paymentApi.getIntent(order.id);
      if (intent.status === 'PAID') {
        toast.info(t('order.payAlreadyPaid', { defaultValue: 'Order already paid' }));
        return;
      }
      // dev 便利链路（paymentApi 内部有 __DEV__ 守卫）；prod 真实收银台接入后替换
      await paymentApi.mockPay(order.id);
      await paymentApi.confirm(order.id);
      toast.success(t('order.paySuccess', { defaultValue: 'Payment successful' }));
    } catch {
      toast.error(t('order.payFailed', { defaultValue: 'Payment failed, please try again' }));
    } finally {
      payLockRef.current = false;
      setPayPending(false);
    }
  };
  // N-P2-11：复购同样补 ref 锁（连点多订单项重复加购）
  const handleRepeatOrderLocked = async () => {
    if (repeatLockRef.current) return;
    repeatLockRef.current = true;
    setRepeatPending(true);
    try {
      await handleRepeatOrder(order, { addToCart, t, toast });
    } finally {
      repeatLockRef.current = false;
      setRepeatPending(false);
    }
  };
  const outline = (label: string, onPress: () => void, testID: string, disabled = false) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.outlineBtn,
        { backgroundColor: colors['surface-container'] },
        pressed && !disabled && { transform: [{ scale: 0.95 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: disabled }}
    >
      <Text style={[styles.btnText, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );

  const solid = (label: string, onPress: () => void, testID: string, disabled = false) => (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.solidBtn,
        { backgroundColor: colors.primary },
        shadowPresets.umaLulik,
        pressed && !disabled && { transform: [{ scale: 0.95 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: disabled }}
    >
      <Text style={[styles.btnText, { color: ON_PRIMARY }]}>{label}</Text>
    </Pressable>
  );

  switch (status) {
    case 'PENDING_PAYMENT':
      return (
        <>
          {outline(
            t('order.actions.cancel', { defaultValue: 'Cancel Order' }),
            onCancel,
            'order-cancel',
          )}
          {/* 批4 补丁（审查待确认-2 裁决）：__DEV__ 保留 mockPay 便利链路；prod 真实收银台
              未接入前隐藏 Pay Now，原位展示不可用提示（勿让 prod 用户误触 mock 支付） */}
          {__DEV__ ? (
            solid(
              t('order.actions.pay', { defaultValue: 'Pay Now' }),
              // C-P3-4（批4）：待支付订单不再跳 /order/checkout（会带入购物车+新建地址，
              // 存在重复下单风险）——留在本详情页原位发起支付（见下方 handlePay）。
              // 原因：handlePay 的 ref 锁仅在点击事件回调内执行，render 期只传引用未调用；
              // react-hooks/refs 跨函数传播把 render 期调用的 solid() 参数误判为 render 期读 ref
              // eslint-disable-next-line react-hooks/refs
              handlePay,
              'order-pay',
              payPending,
            )
          ) : (
            <Text style={styles.payUnavailable} testID="order-pay-unavailable">
              {t('order.payOnlineUnavailable', {
                defaultValue: 'Online payment is unavailable, please pay via customer service',
              })}
            </Text>
          )}
        </>
      );
    case 'PENDING_CONFIRM':
    case 'CONFIRMED':
      return (
        <>
          {outline(
            t('order.actions.cancel', { defaultValue: 'Cancel Order' }),
            onCancel,
            'order-cancel',
          )}
          {solid(
            t('common.contactSeller', { defaultValue: 'Contact Seller' }),
            () => router.push('/service'),
            'order-contact',
          )}
        </>
      );
    case 'PICKED':
    case 'OUT_FOR_DELIVERY':
      return (
        <>
          {outline(
            t('order.actions.track', { defaultValue: 'Track Order' }),
            () => router.push({ pathname: '/order/tracking', params: { id: order.id } }),
            'order-track',
          )}
          {solid(
            t('common.contactSeller', { defaultValue: 'Contact Seller' }),
            () => router.push('/service'),
            'order-contact',
          )}
        </>
      );
    case 'DELIVERED_PAID':
    case 'DELIVERED_UNPAID':
    case 'DELIVERED':
      return (
        <>
          {outline(
            t('order.actions.repurchase', { defaultValue: 'Repeat Order' }),
            // N-P2-11：换带 ref 锁的包装版（同帧连点只走一次加购流程）
            // 原因：ref 锁仅在点击事件回调内执行，render 期只传引用未调用；
            // react-hooks/refs 跨函数传播把 render 期调用的 outline() 参数误判为 render 期读 ref
            // eslint-disable-next-line react-hooks/refs
            () => void handleRepeatOrderLocked(),
            'order-repeat',
            repeatPending,
          )}
          {solid(
            t('order.actions.review', { defaultValue: 'Write a Review' }),
            () =>
              router.push({
                pathname: '/order/review',
                params: {
                  id: order.id,
                  // Why: §8 把订单首商品 id 传给评价页，submit 时归属到正确商品
                  productId: order.items[0]?.product.id,
                },
              }),
            'order-review',
          )}
        </>
      );
    case 'COMPLETED':
      return (
        <>
          {outline(
            t('order.actions.afterSales', { defaultValue: 'After-Sales' }),
            () =>
              router.push({ pathname: '/order/after-sales-apply', params: { orderId: order.id } }),
            'order-aftersales',
          )}
          {solid(
            t('order.actions.repurchase', { defaultValue: 'Buy Again' }),
            // C-P3-5（批4）：同 Repeat Order——真实加购后跳购物车
            // 原因：ref 锁仅在点击事件回调内执行，render 期只传引用未调用；
            // react-hooks/refs 跨函数传播把 render 期调用的 solid() 参数误判为 render 期读 ref
            // eslint-disable-next-line react-hooks/refs
            () => void handleRepeatOrderLocked(),
            'order-repurchase',
            repeatPending,
          )}
        </>
      );
    case 'CANCELLED':
      return (
        <>
          {outline(
            t('common.contactSeller', { defaultValue: 'Contact Seller' }),
            () => router.push('/service'),
            'order-contact',
          )}
          {solid(
            t('order.actions.repurchase', { defaultValue: 'Buy Again' }),
            // C-P3-5（批4）：同 Repeat Order——真实加购后跳购物车
            // 原因：ref 锁仅在点击事件回调内执行，render 期只传引用未调用；
            // react-hooks/refs 跨函数传播把 render 期调用的 solid() 参数误判为 render 期读 ref
            // eslint-disable-next-line react-hooks/refs
            () => void handleRepeatOrderLocked(),
            'order-repurchase',
            repeatPending,
          )}
        </>
      );
  }
}

const styles = StyleSheet.create({
  outlineBtn: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidBtn: {
    flex: 1,
    height: 56,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  // 批4 补丁：prod 待支付态 Pay Now 隐藏后的原位提示（占 outline+solid 双按钮位）
  payUnavailable: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 13,
  },
});
