/**
 * 外部链接拉起工具（P20 审查 Q4）
 *
 * Linking.openURL 返回 Promise，裸调用在无对应 App 的设备（无邮件客户端/无电话 App 的
 * 平板、低端 Android）上 reject，产生未处理 Promise rejection 且用户无任何反馈。
 * 统一收口：catch 后 toast.error 提示（调用方传已翻译的 i18n 文案）。
 */
import { Linking } from 'react-native';
import { toast } from '@/store/toastStore';

/**
 * 拉起外部链接（tel: / mailto: / https: 等），失败时 toast 提示
 * @param url 完整链接（如 'tel:+67077000000'）
 * @param onErrorMsg 失败提示文案（调用方用 t() 翻译后传入，helper 不依赖 i18n）
 */
export function openExternalLink(url: string, onErrorMsg: string): void {
  Linking.openURL(url).catch(() => {
    toast.error(onErrorMsg);
  });
}
