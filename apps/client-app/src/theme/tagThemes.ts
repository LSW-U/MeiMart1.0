/**
 * 地址标签 chip 色板（P16 决策 7）
 *
 * 家=蓝 / 公司=琥珀 / 学校=绿 / 自定义=灰，取自 theme semantic 角色色
 * （info / warning / success 的 container 底 + 主色文字，与订单状态 pill 同构）。
 *
 * Why 不直接用 colors['info-container']：semantic 色不在 AppColors 类型上
 * （见 statusBannerThemes 同款说明），场景色板在主题定义层保留 hex。
 * 暗色模式落地时此处加 dark 变体（当前仅亮色，同 statusBannerPalettes）。
 */

export type AddressTagPreset = 'home' | 'company' | 'school';

export interface AddressTagTheme {
  /** chip 底色（container 浅底） */
  bg: string;
  /** chip 文字色（主色） */
  fg: string;
}

export const addressTagThemes: Record<AddressTagPreset, AddressTagTheme> & {
  custom: AddressTagTheme;
} = {
  home: { bg: '#dbeafe', fg: '#1d4ed8' }, // info-container / info
  company: { bg: '#fef3c7', fg: '#F57C00' }, // warning-container / warning
  school: { bg: '#d1fae5', fg: '#059669' }, // success-container / success
  custom: { bg: '#E7E5E4', fg: '#57534E' }, // stone-200 / stone-600（灰）
};

/** 类型守卫：tag 是三预设之一（守卫后 TS 自动窄化，消费方免 as 断言） */
export function isAddressTagPreset(tag: string): tag is AddressTagPreset {
  return tag === 'home' || tag === 'company' || tag === 'school';
}

export function getAddressTagTheme(tag: string): AddressTagTheme {
  // 守卫窄化替代 as 断言（F6：原 tag as AddressTagPreset 违反规则 #36）
  return isAddressTagPreset(tag) ? addressTagThemes[tag] : addressTagThemes.custom;
}
