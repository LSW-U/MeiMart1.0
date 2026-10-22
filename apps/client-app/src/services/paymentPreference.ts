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

/**
 * 默认支付方式写路径（方案B 2026-10-22：settings 行 + 独立选择页共用）
 *
 * 三步：乐观本地 state 由调用方持有（页面各自 setDefaultPay）→ AsyncStorage 副本
 * → PATCH profile。失败语义（P3-1/P3-2，2026-10-22）：useUpdateProfile onError 只回滚
 * profile query 缓存，本地副本**不回修**——停留新值，后端保持旧值；小窗口偏差由下次
 * 成功 PATCH 自愈（离线降级档读到的是用户最近一次意图值，非资金风险）。调用方必须
 * 传 onApiError 弹 toast 明确告知失败，不静默。
 */
interface UpdateProfileMutate {
  // 方法式声明（双变）以兼容 useMutation 的 UseMutateFunction 泛型签名——属性式箭头
  // 签名对参数逆变收窄会 TS2345；本函数只透传 { defaultPaymentMethod } + onError
  mutate(vars: object, opts?: object): void;
}

export function changeDefaultPayment(
  code: string | null,
  updateProfile: UpdateProfileMutate,
  onApiError: (error: unknown) => void,
): void {
  void setDefaultPaymentMethod(code);
  updateProfile.mutate({ defaultPaymentMethod: code }, { onError: onApiError });
}
