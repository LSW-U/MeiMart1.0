import { resolveCheckoutAddress, useAddressSelectionStore } from '@/store/addressSelectionStore';
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

describe('addressSelectionStore', () => {
  beforeEach(() => {
    useAddressSelectionStore.getState().clear();
  });

  it('resolveCheckoutAddress 回落 isDefault（未手选）', () => {
    const list = [addr('a1'), addr('a2', true), addr('a3')];
    expect(resolveCheckoutAddress(list, null)?.id).toBe('a2');
  });

  it('手选地址优先于 isDefault', () => {
    const list = [addr('a1'), addr('a2', true), addr('a3')];
    expect(resolveCheckoutAddress(list, 'a3')?.id).toBe('a3');
  });

  it('手选地址已被删除时回落默认', () => {
    const list = [addr('a1'), addr('a2', true)];
    expect(resolveCheckoutAddress(list, 'deleted-id')?.id).toBe('a2');
  });

  it('空列表返回 undefined', () => {
    expect(resolveCheckoutAddress(undefined, null)).toBeUndefined();
    expect(resolveCheckoutAddress([], 'x')).toBeUndefined();
  });

  it('select/clear 翻转 store 状态', () => {
    useAddressSelectionStore.getState().select('a1');
    expect(useAddressSelectionStore.getState().selectedId).toBe('a1');
    useAddressSelectionStore.getState().clear();
    expect(useAddressSelectionStore.getState().selectedId).toBeNull();
  });
});
