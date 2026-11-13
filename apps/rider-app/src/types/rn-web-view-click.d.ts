/**
 * RNW（react-native-web）类型补洞：运行时把非 RN props 原样透传到 DOM 元素
 * （createDOMProps 不认识的 prop 直接落 DOM），但 RN 官方 ViewProps 类型没有这些字段。
 *
 * 首个消费者：Modal web 分支（修复 20261027）backdrop/sheet 用 View onClick——
 * RNW 把 role=button 的 Pressable 渲染成真 <button>，与弹窗内交互元素嵌套非法
 * （validateDOMNesting 警告 + 读屏语义污染），故 web 改 View 纯点击面。
 *
 * ⚠️ 仅 web 生效（native 运行时忽略 onClick，勿在 native 分支依赖）。
 */
import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    /** web：DOM click（RNW 透传）。native 无效，勿依赖 */
    onClick?: (e: { stopPropagation(): void }) => void;
  }
}
