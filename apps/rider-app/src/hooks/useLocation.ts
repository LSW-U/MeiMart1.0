import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

import { DEFAULT_COORDINATES } from '../utils/constants';
import { useLocationStore } from '../store/useLocationStore';
import type { Coordinates } from '../types/common';
import { buildLocationPayload } from '../services/location';

type UseLocationOptions = {
  // WS 连接：传入后 watch 回调里 emit 'location:update' 推位置到后端
  socket?: Socket | null;
  // 当前配送中的订单 ID（必填才能推送，后端会校验 Order.riderId）
  currentOrderId?: string;
  // B1: online 守卫。offline 时完全不启动 watch（省电 + 规则 18「离线停止上报」）
  enabled: boolean;
};

export function useLocation(options: UseLocationOptions) {
  const { socket, currentOrderId, enabled } = options;
  // B2: 频率分档依据 —— 有配送任务走 5s（P11 实时），仅在线等单走 15s（省电）
  const hasOrderId = Boolean(currentOrderId);
  const [coordinates, setCoordinates] = useState<Coordinates>(DEFAULT_COORDINATES);
  const [isTracking, setIsTracking] = useState(false);
  const subRef = useRef<Location.LocationSubscription | null>(null);
  // 用 ref 持有最新 orderId，避免 orderId 变化时重启 watchPositionAsync
  const orderIdRef = useRef<string | undefined>(currentOrderId);
  useEffect(() => {
    orderIdRef.current = currentOrderId;
  }, [currentOrderId]);

  useEffect(() => {
    // B1: offline 不启动 watch（GPS 是耗电大头，不能下班后还跑）
    if (!enabled) return;

    let cancelled = false;
    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled || status !== 'granted') return;

        setIsTracking(true);

        const last = await Location.getLastKnownPositionAsync();
        if (cancelled) return;
        if (last) {
          const coords: Coordinates = {
            latitude: last.coords.latitude,
            longitude: last.coords.longitude,
          };
          setCoordinates(coords);
          useLocationStore.getState().setCoordinates(coords);
        }

        // B2: 配送中 5s（P11 物流追踪实时性），仅在线 15s（规则 18 在线档，省电）
        // hasOrderId 变化（接单/送达）会重启 watch 切换频率 —— 接单/送达各一次，可接受
        const interval = hasOrderId ? 5_000 : 15_000;
        const distance = hasOrderId ? 5 : 15;
        subRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: distance, timeInterval: interval },
          (loc) => {
            const coords: Coordinates = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setCoordinates(coords);
            useLocationStore.getState().setCoordinates(coords);

            // 推送到后端：必须传 orderId（后端校验 Order.riderId 匹配）
            // socket 或 orderId 缺一时跳过推送，本地 store 仍更新
            const oid = orderIdRef.current;
            if (socket && socket.connected && oid) {
              // payload 构造（speed/heading 单位换算）抽 buildLocationPayload 共享 helper；
              // 后台 HTTP 通道（useBackgroundTask reportLocationHttp）复用同一 helper，避免逻辑漂移
              socket.emit('location:update', buildLocationPayload(loc.coords, oid));
            }
          },
        );
      } catch (e) {
        // M3: watchPositionAsync 可能 reject（权限后续被撤、设备 GPS 异常），避免 isTracking 卡 true
        console.warn('[useLocation] startTracking failed:', e);
        setIsTracking(false);
      }
    };

    void startTracking();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
      setIsTracking(false);
    };
  }, [enabled, hasOrderId, socket]);

  return { coordinates, isTracking };
}
