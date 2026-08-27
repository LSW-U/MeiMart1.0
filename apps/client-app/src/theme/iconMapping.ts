/**
 * 图标映射表：HTML 原型使用的 Material Symbols 名称 → @expo/vector-icons 的 MaterialCommunityIcons 名称
 *
 * 来源：扫描全部 HTML 原型提取的 material-symbols-outlined 名称（约 70 个）。
 * Material Symbols 与 MaterialCommunityIcons 命名不完全一致（前者 snake_case，后者 kebab-case
 * 且部分语义重命名），下表是经过逐一对照的稳定映射。
 *
 * 用法：
 *   import { MaterialCommunityIcons } from '@expo/vector-icons';
 *   <MaterialCommunityIcons name={symbolToMc('shopping_cart')} size={24} />
 *
 * 若调用方已有 MaterialCommunityIcons 名称，直接使用 IconName 类型即可（见 @/types）。
 */
import type { IconName } from '@/types';

/**
 * Material Symbols（HTML）→ MaterialCommunityIcons（RN）名称映射。
 * 缺失项返回 'circle-outline' 作为兜底（避免运行时崩溃）。
 *
 * P29 审查 F2：字面量表用 satisfies 保留 key 联合推导（MaterialSymbolName 需要），
 * 显式 Record<string,...> 注解会让 keyof 退化成 string。
 */
const SYMBOL_TO_MC_LITERAL = {
  // 通用导航 / 操作
  add: 'plus',
  add_circle: 'plus-circle',
  add_location_alt: 'map-marker-plus',
  add_shopping_cart: 'cart-plus',
  arrow_back: 'arrow-left',
  arrow_forward: 'arrow-right',
  brush: 'brush',
  call: 'phone',
  check: 'check',
  check_circle: 'check-circle',
  checkroom: 'tshirt-crew',
  chevron_right: 'chevron-right',
  close: 'close',
  delete: 'trash-can',
  edit: 'pencil',
  expand_more: 'chevron-down',
  swap_vert: 'swap-vertical',
  favorite: 'heart',
  help: 'help-circle',
  help_outline: 'help-circle-outline',
  info: 'information',
  language: 'translate',
  lightbulb: 'lightbulb',
  more_horiz: 'dots-horizontal',
  my_location: 'crosshairs-gps',
  notifications: 'bell',
  remove: 'minus',
  search: 'magnify',
  // P21 审查 Q2 —— search_off 用 magnify-close（MC 无完全对应的带斜线搜索，取「关闭搜索」最近语义）
  search_off: 'magnify-close',
  // P23 审查发现 1 -- 分组头图标补映射（today/schedule 原漏映射兜底 circle-outline）
  today: 'calendar-today',
  schedule: 'clock-outline',
  // P29-D11 —— 验证码图标对齐 HTML（MC 无 sms，取 message-text-outline 最近语义）
  sms: 'message-text-outline',
  security: 'shield-check',
  send: 'send',
  settings: 'cog',
  share: 'share-variant',
  star: 'star',
  star_rate: 'star',
  trending_flat: 'arrow-right',
  trending_up: 'trending-up',
  tune: 'tune',
  verified: 'check-decagram',
  visibility: 'eye',
  visibility_off: 'eye-off',

  // 电商 / 购物
  apps: 'apps',
  bolt: 'flash',
  cart: 'cart',
  confirmation_number: 'ticket-percent',
  credit_card: 'credit-card',
  grid_view: 'grid',
  view_list: 'view-list',
  headset: 'headphones',
  headset_mic: 'headset',
  history: 'history',
  home: 'home',
  inventory_2: 'package-variant-closed',
  local_florist: 'flower',
  local_offer: 'tag',
  local_shipping: 'truck',
  location_city: 'city',
  // V19 P16 地址 chip —— 学校标签小图标
  school: 'school',
  // V22 P23 通知 —— 全部已读（MC 无 done_all，check-all 最近语义）
  done_all: 'check-all',
  location_on: 'map-marker',
  lock: 'lock',
  logout: 'logout',
  mail: 'email',
  mic: 'microphone',
  moped: 'moped',
  package_: 'package-variant',
  person: 'account',
  person_add: 'account-plus',
  photo_camera: 'camera',
  play_arrow: 'play',
  radio_button_checked: 'radiobox-marked',
  radio_button_unchecked: 'radiobox-blank',
  receipt_long: 'receipt',
  restaurant: 'silverware-fork-knife',
  sell: 'tag-outline',
  shopping_basket: 'shopping',
  shopping_cart: 'cart',
  support_agent: 'face-agent',

  // 财务
  account_balance: 'bank',
  account_balance_wallet: 'wallet',
  account_circle: 'account-circle',

  // 系统状态
  battery_full: 'battery',
  signal_cellular_alt: 'signal-cellular-3',
  wifi: 'wifi',
  // P28 订单结果页 —— 状态机 icon / 倒计时 / 失败原因 / 支付 badge（7 个补映射）
  // 注意：HTML Material Symbols 的 `cancel` 是 ❌ 图标，但 MC 的 `cancel` 是关闭按钮，故用 close-circle；
  // MC 无 hourglass-top，S2 待支付用 timer-sand（沙漏）兜底
  hourglass_top: 'timer-sand',
  timer: 'timer-sand',
  timer_off: 'timer-off',
  cancel: 'close-circle',
  cloud_off: 'cloud-off-outline',
  error_outline: 'alert-circle-outline',
  payments: 'credit-card',

  // 学习
  auto_stories: 'book-open-page-variant',

  // 社交 / 商业 / 工具（P2 Discover 宫格）
  group_add: 'account-group',
  storefront: 'storefront',
  qr_code_scanner: 'scan-helper',

  // P25 关于页（使命/法律/联系/社交）
  handshake: 'handshake',
  description: 'file-document-outline',
  privacy_tip: 'shield-lock',
  phone: 'phone',
  facebook: 'facebook',
  whatsapp: 'whatsapp',
  instagram: 'instagram',
} satisfies Readonly<Record<string, IconName>>;

const SYMBOL_TO_MC: Readonly<Record<string, IconName>> = SYMBOL_TO_MC_LITERAL;

const FALLBACK_NAME = 'circle-outline' as IconName;

/**
 * 把 HTML 原型的 Material Symbols 名称翻译为 @expo/vector-icons 的 MaterialCommunityIcons 名称。
 *
 * @param symbolName HTML 中的 material-symbols-outlined 文本（如 'shopping_cart'）
 * @returns MaterialCommunityIcons name（如 'cart'）；未知返回兜底图标
 */
export function symbolToMc(symbolName: string): IconName {
  return SYMBOL_TO_MC[symbolName] ?? FALLBACK_NAME;
}

export type { IconName };

/**
 * P29 审查 F2：HTML Material Symbols 名联合（映射表 key 推导）。
 * 供 Input 等 UI 组件入参收窄用——`IconName | MaterialSymbolName`
 * 既允许传 HTML 符号名（如 'sms'）、又保留编译期拼写校验（拼错 tsc 即拦）。
 */
export type MaterialSymbolName = keyof typeof SYMBOL_TO_MC_LITERAL;
