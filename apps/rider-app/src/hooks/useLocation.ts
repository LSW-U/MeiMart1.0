import * as Location from 'expo-location';
import type { Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';

import { useLocationStore } from '../store/useLocationStore';
import type { Coordinates } from '../types/common';
import { buildLocationPayload } from '../services/location';

type UseLocationOptions = {
  // WS 连接：传入后 watch 回调里 emit 'location:update' 推位置到后端
  socket?: Socket | null;
  // 当前配送中的订单 ID（必填才能推送，后端会校验 Order.riderId）
  currentOrderId?: string;
  // B1/R-P1-1: online 三态守卫。仅明确 offline（online===false）时停 watch；
  //   null（settings 未就绪/加载失败）必须继续跑，保活派单（D16）
  enabled: boolean;
};

export function useLocation(options: UseLocationOptions) {
  const { socket, currentOrderId, enabled } = options;
  // B2: 频率分档依据 —— 有配送任务走 5s（P11 实时），仅在线等单走 15s（省电）
  const hasOrderId = Boolean(currentOrderId);
  const subRef = useRef<Location.LocationSubscription | null>(null);
  // R-P1-4：用 ref 持有 socket/orderId，effect 依赖只剩 [enabled, hasOrderId]——
  //   原 effect 依赖 socket 引用（useRiderSocket 每次 setState 新引用），socket 对象
  //   换一次 watch 就重启一次（重启风暴：GPS 冷启 + 断连 + Android 前台通知闪）。
  const socketRef = useRef<Socket | null | undefined>(socket);
  const orderIdRef = useRef<string | undefined>(currentOrderId);
  // C9：等单档节流（30s 内至多 emit 一次；配送中不受限）
  const lastEmitRef = useRef(0);
  useEffect(() => {
    socketRef.current = socket;
    orderIdRef.current = currentOrderId;
  }, [socket, currentOrderId]);

  useEffect(() => {
    // B1: offline 不启动 watch（GPS 是耗电大头，不能下班后还跑）
    if (!enabled) return;

    let cancelled = false;
    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled || status !== 'granted') return;

        const last = await Location.getLastKnownPositionAsync();
        if (cancelled) return;
        if (last) {
          const coords: Coordinates = {
            latitude: last.coords.latitude,
            longitude: last.coords.longitude,
          };
          useLocationStore.getState().setCoordinates(coords);
        }

        // B2: 配送中 5s（P11 物流追踪实时性），仅在线 15s（规则 18 在线档，省电）
        // hasOrderId 变化（接单/送达）会重启 watch 切换频率 —— 接单/送达各一次，可接受
        // C9（R-P2-9）：等单档降档 Balanced/30m + 30s 节流——等单骑手是派单 candidates
        //   主体，位置新鲜度要求低于配送中；原等单档 High/15s 与「省电」注释不符。
        //   distanceInterval 与 timeInterval 任一触发即回调（RN 语义），30s 节流项
        //   lastEmitRef 去重，避免漂移 30m 内高频 emit。
        const interval = hasOrderId ? 5_000 : 30_000;
        const distance = hasOrderId ? 5 : 30;
        const sub = await Location.watchPositionAsync(
          {
            accuracy: hasOrderId ? Location.Accuracy.High : Location.Accuracy.Balanced,
            distanceInterval: distance,
            timeInterval: interval,
          },
          (loc) => {
            const coords: Coordinates = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            // R-P1-4：直写 zustand store（消费方读 store），删本地 setCoordinates state——
            //   原本地 state 每 5s 触发 MainContent 整树重渲染，返回值其实被 _layout 丢弃。
            useLocationStore.getState().setCoordinates(coords);

            // 推送到后端（真实环境接入批B，R12 准入：等单骑手是派单 candidates 主体）
            //   - 带 orderId（配送中）：后端归属校验 + 广播 order:location + 落 Redis
            //   - 无 orderId（等单前台）：后端走「仅落 rider:loc Redis」分支，不广播——
            //     原实现无 orderId 不 emit 导致等单期距离分恒回退中点；仅前台亮屏上报（R22，
            //     切后台/锁屏 RN 前台定位自动暂停，坐标过期由后端读侧新鲜度阈值回退中点兜底）
            // socket 缺一跳过推送，本地 store 仍更新
            const socketCurrent = socketRef.current;
            const oid = orderIdRef.current;
            // C9：等单档（无 oid）30s 节流——watch 双阈值（30m/30s）任一触发即回调，
            // 静止漂移场景仍会高频进回调，emit 前按时间闸一次
            const now = Date.now();
            if (!oid && now - lastEmitRef.current < 30_000) return;
            lastEmitRef.current = now;
            if (socketCurrent && socketCurrent.connected) {
              // payload 构造（speed/heading 单位换算）抽 buildLocationPayload 共享 helper；
              // 后台 HTTP 通道（useBackgroundTask reportLocationHttp）复用同一 helper，避免逻辑漂移。
              // 等单期（无 oid）后端 RiderLocationUpdate.orderId 为 optional，直接 emit 不带 orderId。
              socketCurrent.emit('location:update', buildLocationPayload(loc.coords, oid));
            }
          },
        );
        // R-P1-4 泄漏修复：await 期间可能已卸载/依赖变化，此时绝不能把订阅挂上
        //   （原实现 subRef.current = await ...，卸载清理先跑、订阅后挂 → 永久泄漏）。
        if (cancelled) {
          sub.remove();
          return;
        }
        subRef.current = sub;
      } catch (e) {
        // M3: watchPositionAsync 可能 reject（权限后续被撤、设备 GPS 异常），避免 isTracking 卡 true
        console.warn('[useLocation] startTracking failed:', e);
      }
    };

    void startTracking();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [enabled, hasOrderId]);

  // R-P1-4：返回值原被 _layout 丢弃，本地 state 只造成重渲染——返回值删除，坐标统一走 useLocationStore
}
