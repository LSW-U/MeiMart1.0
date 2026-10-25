export const colors = {
  background: '#fff8f7',
  surface: '#ffffff',
  primary: '#720003',
  primarySoft: '#ffe9e6',
  primaryContainer: '#961813',
  border: '#f7ddd9',
  text: '#261816',
  textMuted: '#59413d',
  success: '#137a3a',
  warning: '#b25a00',
  danger: '#961813',
  // B1 裁决 B：chat 图标钮蓝底（原型 --info: #1a6fb0）
  info: '#1a6fb0',

  // 状态标签语义色（bg + text 配对）
  statusSuccessBg: '#dcf5e3',
  statusSuccessText: '#1f7a3a',
  statusDangerBg: '#fde2df',
  statusDangerText: '#a3322a',
  statusWarningBg: '#fff3d6',
  statusWarningText: '#a06b00',
  // busy 班次点（原复用 status-transferred-text「已转单」橙 #b06000 取值，B7 P2-1 补专用语义）
  busy: '#b06000',
  // E1 审查 P2-1：交易类型徽标图标色——与 tailwind status-done-text / warn-text 同源
  // （#137333 / #e65100），AppIcon color prop 场景引用（colorByClass 不含 status/warn 系）
  statusDoneText: '#137333',
  // R-P1-8（走查 20261024）：warn 系对比度——#e65100 on #fff3e0 仅 3.46:1，
  // 加深至 #9a3412（6.67:1；on 白 7.31:1）；statusTransferredText #b06000→#8a4a00（6.40:1）
  warnText: '#9a3412',
  statusTransferredBg: '#fef7e0',
  statusTransferredText: '#8a4a00',
  // R-P0-3（UI 走查 20261024）：商品清单琥珀筹码——白字 on #f59e0b 仅 2.15:1，
  // 改 15% 浅底 + #92400e 深棕字（实算 ≈6.3:1）；amber 系此前仅 tailwind config 单侧有，双源补齐
  accentAmber: '#f59e0b',
  amberText: '#92400e',

  // 通知分类色
  notificationTask: '#ff9800',
  notificationOrder: '#1976d2',
  notificationWallet: '#388e3c',
  notificationSystem: '#8d706c',

  // 交互辅助色
  outline: '#8d706c',
  outlineVariant: '#e1bfba',
  error: '#ba1a1a',

  // 地图标记色（对齐 tailwind tertiary，pinColor JS 用）
  tertiary: '#463200',

  // R-P1-7（走查 20261024 · D2=A 拍板）：colors.ts 升级为颜色单一真源，
  // 以下为原 tailwind.config.js 独有 token 的回填（值未动；config 改由本文件生成映射）
  tertiaryContainer: '#634700',
  surfaceContainerLow: '#fff0ee',
  surfaceContainerHigh: '#fde2df',
  statusDoneBg: '#e6f4ea',
  statusCancelledBg: '#e2e3e2',
  statusCancelledText: '#1a1c1c',
  warnBg: '#fff3e0',
  warnBorder: '#ffe0b2',
  successDeep: '#2d6a2e',
  neutralBg: '#e2e3e2',
  neutral: '#636565',
  neutralMuted: '#5d5f5f',
  tierGold: '#deb769',
  tierGoldSoft: '#ffdea3',
  tierGoldText: '#5d4200',
  surfaceTrack: '#d7c1bd',
  surfaceFrame: '#eed4d1',
  dotOff: '#b9aaa7',
  dotUnread: '#ff4d4f',
  surfaceBlush: '#ffe1dc',
  blushBorder: '#f1d4cf',
  dangerSoft: '#ffdad6',

  // 半透色（图标/覆盖层用）
  surface60: 'rgba(255,255,255,0.6)',
};
