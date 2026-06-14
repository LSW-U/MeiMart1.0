import { act } from '@testing-library/react-native';
import type { Address } from '@/types';
import { addressApi } from '@/services/address';
import {
  ADDRESSES_QUERY_KEY,
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from '../useAddress';
import { createTestQueryClient, renderHookWithClient } from './testHarness';

jest.mock('@/services/address');

const baseAddresses: Address[] = [
  {
    id: 'a1',
    name: '张三',
    phone: '13800000001',
    province: '北京市',
    city: '北京市',
    district: '朝阳区',
    detail: '建国路 88 号',
    isDefault: true,
  },
  {
    id: 'a2',
    name: '李四',
    phone: '13800000002',
    province: '上海市',
    city: '上海市',
    district: '浦东新区',
    detail: '世纪大道 100 号',
    isDefault: false,
  },
];

function setup(getAddressesMock: Address[] = baseAddresses) {
  (addressApi.getAddresses as jest.Mock).mockResolvedValue(getAddressesMock);
  const qc = createTestQueryClient();
  qc.setQueryData(ADDRESSES_QUERY_KEY, baseAddresses);
  return qc;
}

describe('useAddress 乐观更新', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useCreateAddress 立即追加新地址', async () => {
    const created: Address = {
      id: 'a3',
      name: '王五',
      phone: '13900000003',
      province: '广东省',
      city: '深圳市',
      district: '南山区',
      detail: '科技园',
      isDefault: false,
    };
    (addressApi.createAddress as jest.Mock).mockResolvedValue(created);
    const qc = setup([...baseAddresses, created]);
    renderHookWithClient(() => useAddresses(), qc);

    const { result } = renderHookWithClient(() => useCreateAddress(), qc);
    await act(async () => {
      await result.current.mutateAsync({
        name: '王五',
        phone: '13900000003',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        detail: '科技园',
        isDefault: false,
      });
    });

    const list = qc.getQueryData<Address[]>(ADDRESSES_QUERY_KEY);
    expect(list).toHaveLength(3);
    expect(list?.[2].name).toBe('王五');
  });

  it('useUpdateAddress 立即 merge updates', async () => {
    (addressApi.updateAddress as jest.Mock).mockResolvedValue({ id: 'a1' });
    const qc = setup();

    const { result } = renderHookWithClient(() => useUpdateAddress(), qc);
    await act(async () => {
      await result.current.mutateAsync({ id: 'a1', updates: { name: '张三丰' } });
    });

    const list = qc.getQueryData<Address[]>(ADDRESSES_QUERY_KEY);
    expect(list?.[0].name).toBe('张三丰');
  });

  it('useDeleteAddress 立即从列表移除', async () => {
    (addressApi.deleteAddress as jest.Mock).mockResolvedValue(undefined);
    const qc = setup();

    const { result } = renderHookWithClient(() => useDeleteAddress(), qc);
    await act(async () => {
      await result.current.mutateAsync('a2');
    });

    const list = qc.getQueryData<Address[]>(ADDRESSES_QUERY_KEY);
    expect(list?.find((a) => a.id === 'a2')).toBeUndefined();
    expect(list).toHaveLength(1);
  });

  it('useSetDefaultAddress 立即切换默认（互斥）', async () => {
    (addressApi.updateAddress as jest.Mock).mockResolvedValue({ id: 'a2' });
    const qc = setup();

    const { result } = renderHookWithClient(() => useSetDefaultAddress(), qc);
    await act(async () => {
      await result.current.mutateAsync('a2');
    });

    const list = qc.getQueryData<Address[]>(ADDRESSES_QUERY_KEY);
    expect(list?.find((a) => a.id === 'a1')?.isDefault).toBe(false);
    expect(list?.find((a) => a.id === 'a2')?.isDefault).toBe(true);
  });

  it('useCreateAddress 服务端失败时 rollback', async () => {
    (addressApi.createAddress as jest.Mock).mockRejectedValue(new Error('network'));
    const qc = setup();

    const { result } = renderHookWithClient(() => useCreateAddress(), qc);
    await act(async () => {
      try {
        await result.current.mutateAsync({
          name: '失败用户',
          phone: '13900000099',
          province: 'X',
          city: 'X',
          district: 'X',
          detail: 'X',
          isDefault: false,
        });
      } catch {
        // expected
      }
    });

    const list = qc.getQueryData<Address[]>(ADDRESSES_QUERY_KEY);
    expect(list).toHaveLength(2); // 回到初始 2 项
    expect(list?.find((a) => a.name === '失败用户')).toBeUndefined();
  });
});
