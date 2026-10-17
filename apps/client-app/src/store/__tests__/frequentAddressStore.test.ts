// B6 智能默认 —— resolveSmartDefaultAddress 优先级链 + recordOrder 记账/LRU 单测（客户画像批3 2026-10-18）
import { resolveSmartDefaultAddress, useFrequentAddressStore } from '@/store/frequentAddressStore';
import type { Address } from '@/types';

function addr(id: string, isDefault = false): Address {
  return {
    id,
    name: `Name ${id}`,
    phone: '7712 3456',
    province: 'Dili',
    city: 'Dili',
    district: 'Vera Cruz',
    detail: 'Rua 1',
    isDefault,
  };
}

describe('resolveSmartDefaultAddress', () => {
  it('本次会话手选优先于本地频次', () => {
    const list = [addr('a1'), addr('a2', true)];
    const counts = { a1: 5, a2: 3 };
    expect(resolveSmartDefaultAddress(list, 'a2', counts)?.id).toBe('a2');
  });

  it('无手选时本地频次最高者优先于 isDefault', () => {
    const list = [addr('a1'), addr('a2', true)];
    const counts = { a1: 5, a2: 3 };
    expect(resolveSmartDefaultAddress(list, null, counts)?.id).toBe('a1');
  });

  it('无频次记录时回落 isDefault', () => {
    const list = [addr('a1'), addr('a2', true)];
    expect(resolveSmartDefaultAddress(list, null, {})?.id).toBe('a2');
    expect(resolveSmartDefaultAddress(list, null, { deleted: 9 })?.id).toBe('a2');
  });

  it('频次与 isDefault 均无命中时回落第一条', () => {
    const list = [addr('a1'), addr('a2')];
    expect(resolveSmartDefaultAddress(list, null, {})?.id).toBe('a1');
  });

  it('频次里已删除的地址不参与（只计现存地址）', () => {
    const list = [addr('a1'), addr('a2', true)];
    // a3 曾高频下单但已删除 → 不应被选中
    expect(resolveSmartDefaultAddress(list, null, { a3: 9, a2: 2 })?.id).toBe('a2');
  });

  it('同频取列表序首个（确定性）', () => {
    const list = [addr('a1'), addr('a2')];
    expect(resolveSmartDefaultAddress(list, null, { a1: 2, a2: 2 })?.id).toBe('a1');
  });

  it('空列表/undefined 返回 undefined', () => {
    expect(resolveSmartDefaultAddress(undefined, null, {})).toBeUndefined();
    expect(resolveSmartDefaultAddress([], null, {})).toBeUndefined();
  });
});

describe('useFrequentAddressStore.recordOrder', () => {
  beforeEach(() => {
    useFrequentAddressStore.setState({ counts: {} });
  });

  it('记账累加频次', () => {
    const { recordOrder } = useFrequentAddressStore.getState();
    recordOrder('a1');
    recordOrder('a1');
    recordOrder('a2');
    expect(useFrequentAddressStore.getState().counts).toEqual({ a1: 2, a2: 1 });
  });

  it('超过 20 条容量时淘汰频次最低一条', () => {
    const { recordOrder } = useFrequentAddressStore.getState();
    // 先放 19 条各 1 次，再放 1 条 a-x 5 次（a-x 是最高频，不应被淘汰）
    useFrequentAddressStore.setState((s) => {
      const counts: Record<string, number> = { ...s.counts };
      for (let i = 0; i < 19; i += 1) counts[`addr-${i}`] = 1;
      return { counts };
    });
    for (let i = 0; i < 5; i += 1) recordOrder('a-x');
    // 再记一条新的 → 总数 21 → 淘汰频次最低（addr-* 中首个）
    recordOrder('a-new');
    const counts = useFrequentAddressStore.getState().counts;
    expect(Object.keys(counts)).toHaveLength(20);
    expect(counts['addr-0']).toBeUndefined();
    expect(counts['a-x']).toBe(5);
    expect(counts['a-new']).toBe(1);
  });
});
