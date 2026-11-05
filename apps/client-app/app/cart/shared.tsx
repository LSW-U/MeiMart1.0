// 购物车页共享常量（业务增强批3 拆分：从 app/(main)/cart.tsx 原样搬移，行为零变更）

// 原因：primary header / CHECKOUT 按钮上的固定白字。两种模式都是品牌红底，白字正确不变。
// 不可用 colors['on-primary']：dark 模式下翻为 #690005（暗红），叠红底会裂色（同 P2 ON_PRIMARY）。
export const ON_PRIMARY = '#ffffff';
