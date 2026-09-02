/**
 * 保证金 query hooks（批 G，2026-09-03）
 *
 * staleTime 60s（HTML 原型「弱网」原则：status 低频变化）+ 登录态 gating；
 * 缴纳/支付成功后 invalidate 重取。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '../../store/useAuthStore';
import { depositApi, type CreateDepositPayload } from '../deposit';

export const depositStatusKey = ['deposit', 'status'] as const;

export function useDepositStatus() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: depositStatusKey,
    queryFn: () => depositApi.getStatus(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useCreateDepositRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDepositPayload) => depositApi.createRequest(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: depositStatusKey });
    },
  });
}

export function usePayMockDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => depositApi.payMock(requestId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: depositStatusKey });
    },
  });
}

/** 缴纳点列表（补端点批：真端点 /rider/deposit/locations；admin 改动低频，5min 鲜） */
export function useDepositLocations() {
  return useQuery({
    queryKey: ['deposit', 'locations'] as const,
    queryFn: () => depositApi.getLocations(),
    staleTime: 5 * 60_000,
  });
}

/** 档位列表（补端点批：真端点 /rider/deposit/tiers；缴纳页提示用） */
export function useDepositTiers() {
  return useQuery({
    queryKey: ['deposit', 'tiers'] as const,
    queryFn: () => depositApi.getTiers(),
    staleTime: 5 * 60_000,
  });
}
