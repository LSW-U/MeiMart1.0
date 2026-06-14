import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressApi } from '@/services/address';
import type { Address } from '@/types';

export const ADDRESSES_QUERY_KEY = ['addresses'] as const;

export function useAddresses() {
  return useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: () => addressApi.getAddresses(),
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (addr: Omit<Address, 'id'>) => addressApi.createAddress(addr),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Address> }) =>
      addressApi.updateAddress(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => addressApi.deleteAddress(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY }),
  });
}
