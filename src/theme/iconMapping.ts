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
 */
const SYMBOL_TO_MC: Readonly<Record<string, IconName>> = {
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
  favorite: 'heart',
  help: 'help-circle',
  help_outline: 'help-circle-outline',
  info: 'information',
  language: 'translate',
  more_horiz: 'dots-horizontal',
  my_location: 'crosshairs-gps',
  notifications: 'bell',
  remove: 'minus',
  search: 'magnify',
  security: 'shield-check',
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
  bolt: 'flash',
  cart: 'cart',
  confirmation_number: 'ticket-percent',
  credit_card: 'credit-card',
  grid_view: 'grid',
  headset: 'headphones',
  headset_mic: 'headset',
  history: 'history',
  home: 'home',
  local_florist: 'flower',
  local_offer: 'tag',
  local_shipping: 'truck',
  location_city: 'city',
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

  // 学习
  auto_stories: 'book-open-page-variant',
};

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
