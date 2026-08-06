import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

import { DEFAULT_COORDINATES } from '../utils/constants';
import { useLocationStore } from '../store/useLocationStore';
import type { Coordinates } from '../types/common';

type UseLocationOptions = {
  // WS 连接：传入后 watch 回调里 emit 'location:update' 推位置到后端
  socket?: Socket | null;
  // 当前配送中的订单 ID（必填才能推送，后端会校验 Order.riderId）
  currentOrderId?: string;
};

export function useLocation(options: UseLocationOptions = {}) {
  const { socket, currentOrderId } = options;
  const [coordinates, setCoordinates] = useState<Coordinates>(DEFAULT_COORDINATES);
  const [isTracking, setIsTracking] = useState(false);
  const subRef = useRef<Location.LocationSubscription | null>(null);
  // 用 ref 持有最新 orderId，避免 orderId 变化时重启 watchPositionAsync
  const orderIdRef = useRef<string | undefined>(currentOrderId);
  useEffect(() => {
    orderIdRef.current = currentOrderId;
  }, [currentOrderId]);

  useEffect(() => {
    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      setIsTracking(true);

      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        const coords: Coordinates = {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
        };
        setCoordinates(coords);
        useLocationStore.getState().setCoordinates(coords);
      }

      // P11 物流追踪要求 ~5s 上报（对齐客户端 useTracking 5s 轮询兜底）
      // distanceInterval 5m 过滤 GPS 漂移；静止时不触发上报，位置未变合理
      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5_000 },
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
            // expo-location speed 是 m/s，后端要 km/h；iOS 静止时为 -1 视为无效
            const rawSpeed = loc.coords.speed;
            const speed =
              typeof rawSpeed === 'number' && rawSpeed >= 0
                ? Math.round(rawSpeed * 3.6 * 10) / 10
                : undefined;
            const rawHeading = loc.coords.heading;
            const heading = typeof rawHeading === 'number' ? rawHeading : undefined;
            socket.emit('location:update', {
              orderId: oid,
              lat: coords.latitude,
              lng: coords.longitude,
              timestamp: Date.now(),
              ...(speed !== undefined ? { speed } : {}),
              ...(heading !== undefined ? { heading } : {}),
            });
          }
        },
      );
    };

    void startTracking();

    return () => {
      subRef.current?.remove();
      subRef.current = null;
      setIsTracking(false);
    };
  }, [socket]);

  return { coordinates, isTracking };
}
