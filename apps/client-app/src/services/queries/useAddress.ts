import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressApi } from '@/services/address';
import type { Address } from '@/types';

export const ADDRESSES_QUERY_KEY = ['addresses'] as const;

function enforceSingleDefault(addresses: Address[], defaultId?: string): Address[] {
  if (defaultId === undefined) return addresses;
  return addresses.map((a) => (a.id === defaultId ? a : { ...a, isDefault: false }));
}

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
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ADDRESSES_QUERY_KEY });
      const previous = qc.getQueryData<Address[]>(ADDRESSES_QUERY_KEY);
      const tempId = `a${Date.now()}`;
      const newAddr: Address = { ...input, id: tempId };
      qc.setQueryData<Address[]>(ADDRESSES_QUERY_KEY, (old) => {
        if (!old) return old;
        const appended = [...old, newAddr];
        return input.isDefault ? enforceSingleDefault(appended, tempId) : appended;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ADDRESSES_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Address> }) =>
      addressApi.updateAddress(id, updates),
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey: ADDRESSES_QUERY_KEY });
      const previous = qc.getQueryData<Address[]>(ADDRESSES_QUERY_KEY);
      qc.setQueryData<Address[]>(ADDRESSES_QUERY_KEY, (old) => {
        if (!old) return old;
        const merged = old.map((a) => (a.id === id ? { ...a, ...updates } : a));
        return updates.isDefault ? enforceSingleDefault(merged, id) : merged;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ADDRESSES_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => addressApi.deleteAddress(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ADDRESSES_QUERY_KEY });
      const previous = qc.getQueryData<Address[]>(ADDRESSES_QUERY_KEY);
      qc.setQueryData<Address[]>(ADDRESSES_QUERY_KEY, (old) =>
        old ? old.filter((a) => a.id !== id) : old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ADDRESSES_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY }),
  });
}

export function useSetDefaultAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => addressApi.updateAddress(id, { isDefault: true }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ADDRESSES_QUERY_KEY });
      const previous = qc.getQueryData<Address[]>(ADDRESSES_QUERY_KEY);
      qc.setQueryData<Address[]>(ADDRESSES_QUERY_KEY, (old) => {
        if (!old) return old;
        const next = old.map((a) => ({ ...a, isDefault: a.id === id }));
        return next;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ADDRESSES_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY }),
  });
}
