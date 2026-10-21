/**
 * 默认支付方式本地偏好（方案甲 2026-10-21 → 方案乙批2 降级为离线缓存 2026-10-22）
 *
 * 读写主源已切 profile 接口（user.defaultPaymentMethod，D5）；本文件保留为
 * AsyncStorage 离线缓存副本：
 *   - 读：profile 请求失败/离线时回退到这里（checkout 优先级链第二档）
 *   - 写：PATCH profile 成功后同步更新本地副本（跨页即时生效 + 离线可用）
 *
 * 旧方案甲语义（本地为唯一真源）已废弃，切换原因见方案 v3 §2。
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
