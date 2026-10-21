/**
 * 默认支付方式本地偏好（方案甲，2026-10-21）
 *
 * AsyncStorage 存用户在设置页选的默认支付方式 code（大写枚举，如 'COD'）。
 * checkout 拉到支付方式列表后优先用它预选（列表里没有该 code 时忽略）。
 *
 * 已知取舍（方案乙文档留档：04-后端记录/三端优化更新/安全隐私/）：
 * 换设备/重装丢失、多端不同步；后端 user.defaultPaymentMethod 就绪后切换。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'settings.defaultPaymentMethod';

export async function getDefaultPaymentMethod(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY);
  } catch {
    return null; // 私有窗口/存储被禁等场景降级为未设置
  }
}

export async function setDefaultPaymentMethod(code: string | null): Promise<void> {
  try {
    if (code == null) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, code);
  } catch {
    // 写失败静默（偏好非关键数据，结算页有 COD 兜底）
  }
}
