/**
 * ≈¥ 人民币估算显示工具（批B，微信支付预留 2026-09-08，方案V2 §3.2 第 10 条）
 *
 * 口径（方案 §3.2）：
 *   - 仅人民币结算通道（WECHAT / WECHAT_GLOBAL / ALIPAY_CN）且 locale=zh 时，
 *     金额位显示 `$X ≈ ¥Y`
 *   - Y = 订单快照 estimatedCnyAmount（批A 下单锁汇率，分单位）；非人民币单不显示
 *   - 其余 locale / 渠道不显示（本地用户纯 USD 零干扰）
 *
 * 纯函数集中在此，便于单测（显示口径与后端 CNY_PAYMENT_METHODS 集合一致）。
 */

/** 人民币结算通道集合（与后端 apps/api rate.config CNY_PAYMENT_METHODS 同口径） */
export const CNY_DISPLAY_METHODS: ReadonlySet<string> = new Set([
  'WECHAT',
  'WECHAT_GLOBAL',
  'ALIPAY_CN',
]);

/**
 * 是否显示 ≈¥ 估算
 *
 * @param paymentMethod 订单支付方式（大写枚举）
 * @param locale 当前语言（仅 zh 显示）
 * @param estimatedCnyAmount 订单快照人民币估算金额（分）；null/undefined = 非人民币单
 */
export function shouldShowCnyEstimate(
  paymentMethod: string | undefined,
  locale: string,
  estimatedCnyAmount: number | null | undefined,
): boolean {
  if (!paymentMethod || !CNY_DISPLAY_METHODS.has(paymentMethod)) return false;
  if (locale !== 'zh') return false;
  if (estimatedCnyAmount == null || estimatedCnyAmount <= 0) return false;
  return true;
}

/** 分（Int）→ 元字符串（1447 → '14.47'） */
export function formatCnyAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}
