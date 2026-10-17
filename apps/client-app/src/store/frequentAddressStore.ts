// B6 智能默认 — 地址使用频次本地记账（客户画像批3 2026-10-18）
//
// Why: 后端 profile 模块的 frequentAddresses 聚合挂 admin 端点（客户 360 背调页），
//      client 端无「常用地址偏好」端点——取简单方案（任务书 4「取简单者并在回复注明」）：
//      端侧按「下单成功」事件记账 addressId 频次，zustand persist 落盘。
// 语义: 只记频次不改 isDefault；checkout 预填优先级 = 本次会话手选 > 本地频次最高 >
//      isDefault > 第一条（resolveCheckoutAddress 兜底链不变，本 store 只插在频次一层）。
// 容量: 记录上限 20 条（LRU 淘汰最低频），防历史地址无限膨胀。
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Address } from '@/types';

const MAX_ENTRIES = 20;

interface FrequentAddressState {
  /** addressId → 下单成功次数 */
  counts: Record<string, number>;
  /** 下单成功后记账（checkout 成功回调调用） */
  recordOrder: (addressId: string) => void;
}

export const useFrequentAddressStore = create<FrequentAddressState>()(
  persist(
    (set) => ({
      counts: {},
      recordOrder: (addressId) =>
        set((state) => {
          const counts = { ...state.counts, [addressId]: (state.counts[addressId] ?? 0) + 1 };
          // 超容量淘汰频次最低的一条（同频取遍历序首个——Record 键序即插入序，近似 LRU）
          const ids = Object.keys(counts);
          if (ids.length > MAX_ENTRIES) {
            let minId = ids[0]!;
            for (const id of ids) {
              if (counts[id]! < counts[minId]!) minId = id;
            }
            delete counts[minId];
          }
          return { counts };
        }),
    }),
    {
      name: 'frequent-address-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * 结算页统一取址（B6 预填版）：手选 > 本地频次最高 > isDefault > 第一条。
 *
 * Why 独立函数不塞 resolveCheckoutAddress：该函数已被 3 个页面测试 mock 断言形状，
 * 改签名会震荡；B6 只影响 checkout 一处，新函数旁路叠加，原函数原样保留兜底。
 */
export function resolveSmartDefaultAddress(
  addresses: Address[] | undefined,
  selectedId: string | null,
  counts: Record<string, number>,
): Address | undefined {
  if (!addresses || addresses.length === 0) return undefined;
  const selected = selectedId ? addresses.find((a) => a.id === selectedId) : undefined;
  if (selected) return selected;
  // 本地频次：只计在当前地址列表中仍存在的 id（删掉的地址自然失效），同频取列表序首个（确定性）
  let best: Address | undefined;
  let bestCount = 0;
  for (const a of addresses) {
    const c = counts[a.id] ?? 0;
    if (c > bestCount) {
      best = a;
      bestCount = c;
    }
  }
  if (best) return best;
  return addresses.find((a) => a.isDefault) ?? addresses[0];
}
