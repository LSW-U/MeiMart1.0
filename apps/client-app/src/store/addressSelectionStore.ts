// Address selection store — 地址列表页 → 结算页的选中回传中转
// Why: expo-router 的 router.back() 无法携带参数，list.tsx（决策 6「选择并返回」模式）
//      选中地址后写入此 store 再 back()，checkout 订阅 selectedAddressId 即时重渲染。
//      只影响本次结算会话的展示/下单用址，不改用户的 isDefault 数据（选 ≠ 设默认）。
import { create } from 'zustand';
import type { Address } from '@/types';

interface AddressSelectionState {
  /** 本次结算会话选中的地址 id（null = 未选过，回落 isDefault） */
  selectedId: string | null;
  select: (id: string) => void;
  /** 下单成功 / 离开结算流程后清除，避免污染下次结算 */
  clear: () => void;
}

export const useAddressSelectionStore = create<AddressSelectionState>((set) => ({
  selectedId: null,
  select: (id) => set({ selectedId: id }),
  clear: () => set({ selectedId: null }),
}));

/** 结算页统一取址：会话内手选地址优先，否则回落默认地址（再回落第一条） */
export function resolveCheckoutAddress(addresses: Address[] | undefined, selectedId: string | null): Address | undefined {
  if (!addresses || addresses.length === 0) return undefined;
  return addresses.find((a) => a.id === selectedId) ?? addresses.find((a) => a.isDefault) ?? addresses[0];
}
