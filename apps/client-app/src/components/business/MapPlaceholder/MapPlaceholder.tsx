// MapPlaceholder — P11 物流追踪页装饰性街道网地图（方案 A）
// Why: 从 app/order/tracking.tsx 抽出独立组件，便于复用 + test（规则 8，P11 审查 Q2）。
// 还原自 P11-物流追踪页-优化原型.html L404-425；装饰性优先（用户决策 2026-08-07，匹配 HTML 原型 fixed % 位置）。
// 动态定位 + haversine 距离见 模块化处理/P11-地图街道动态定位-方案2.md，留升级。
import { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, borderRadius } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import type { RiderLocation } from '@/services/tracking';

// 原因：红底白字 dark 不变（rider dot 是 colors.primary 红底白 icon，与 P10/P11 ON_PRIMARY const 模式一致；routePinEnd 红底白边同语义）
// 豁免：route-line 起点白底/eta-pill/scale-bar 白底（叠地图保可见性，rgba(255,255,255,0.9-0.95) 同性质，不走 ON_PRIMARY）
const ON_PRIMARY = '#ffffff';

export interface MapPlaceholderProps {
  riderLocation: RiderLocation | null;
  estimatedArrival: string | null;
}

export function MapPlaceholder({ riderLocation, estimatedArrival }: MapPlaceholderProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // Why: 每分钟 tick 触发 re-render，setState 仅在 interval 回调（合规 react-hooks/set-state-in-effect）。
  // minAway 在 render 期算，tick 每分钟刷新；estimatedArrival 变化时组件 re-render 自然重算。
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  // 原因：倒计需 Date.now() 算「剩余分钟」，无纯函数替代；tick 状态每分钟触发 re-render 刷新
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const minAway = estimatedArrival
    ? Math.max(0, Math.round((new Date(estimatedArrival).getTime() - now) / 60000))
    : null;
  const etaText =
    minAway === null
      ? t('tracking.liveTracking', { defaultValue: 'Live tracking' })
      : minAway > 0
        ? t('tracking.minAway', { count: minAway, defaultValue: '{{count}} min away' })
        : t('tracking.arrivingNow', { defaultValue: 'Arriving now' });
  return (
    <View
      style={[
        styles.mapWrap,
        {
          backgroundColor: colors['surface-container'],
          borderColor: colors['outline-variant'],
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${t('tracking.mapA11y', { defaultValue: 'Map showing delivery route' })}${minAway !== null ? `, ${etaText}` : ''}`}
    >
      {/* 装饰性街道网（HTML L405-412 — 2 主路横 + 2 次路竖 + 2 小路） */}
      <View style={styles.mapLayer} pointerEvents="none">
        <View style={[styles.streetMajor, { top: '20%', backgroundColor: colors.outline, opacity: 0.28 }]} />
        <View style={[styles.streetMajor, { top: '65%', backgroundColor: colors.outline, opacity: 0.28 }]} />
        <View style={[styles.streetMinorV, { left: '25%', backgroundColor: colors.outline, opacity: 0.15 }]} />
        <View style={[styles.streetMinorV, { left: '70%', backgroundColor: colors.outline, opacity: 0.15 }]} />
        <View style={[styles.streetMinorH, { top: '45%', backgroundColor: colors.outline, opacity: 0.15 }]} />
        <View style={[styles.streetMinorVThin, { left: '45%', backgroundColor: colors.outline, opacity: 0.15 }]} />
      </View>

      {/* 路线（HTML L413 + L83-85 — 60% 宽旋转 18deg + 起终点 pin） */}
      <View
        style={[styles.routeLine, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        pointerEvents="none"
      >
        <View style={[styles.routePinStart, { backgroundColor: '#ffffff', borderColor: colors.primary }]} />
        <View style={[styles.routePinEnd, { backgroundColor: colors.primary, borderColor: ON_PRIMARY }]} />
      </View>

      {/* 骑手定位（HTML L414-415 — 静态 pulse 光晕 + primary 底白 icon，riderLocation 有值才显示） */}
      {/* testID 供 test 验证条件渲染（rules 7 a11y 之外，riderLocation 无值时整块不渲染） */}
      {riderLocation ? (
        <>
          <View style={[styles.riderPulse, { borderColor: colors.primary }]} pointerEvents="none" />
          <View
            style={[styles.riderDot, { backgroundColor: colors.primary }]}
            pointerEvents="none"
            testID="map-rider-dot"
          >
            <Icon symbol="two_wheeler" size={18} color={ON_PRIMARY} />
          </View>
        </>
      ) : null}

      {/* ETA 浮层（HTML L416-420 — 左上白底胶囊 + 绿点 + X min away 倒计） */}
      <View style={styles.etaPill}>
        <View style={[styles.etaDot, { backgroundColor: colors.semantic.positive }]} />
        <Text style={[styles.etaPillText, { color: colors['on-surface-variant'] }]}>{etaText}</Text>
      </View>

      {/* 比例尺（HTML L421-424 — 右下白底 + 30px 线 + 装饰刻度） */}
      <View style={styles.scaleBar}>
        <View style={[styles.scaleLine, { backgroundColor: colors['on-surface-variant'] }]} />
        <Text style={[styles.scaleText, { color: colors['on-surface-variant'] }]}>
          {t('tracking.scaleBar', { defaultValue: '500 m' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Map（方案 A 装饰性街道网 — 还原自 P11-物流追踪页-优化原型.html L404-425）
  mapWrap: {
    position: 'relative',
    height: 180,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // 街道（HTML L406-411 — colors.outline #8d706c + opacity 表达棕色调）
  streetMajor: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
  },
  streetMinorV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
  },
  streetMinorH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
  },
  streetMinorVThin: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
  },
  // 路线（HTML L83-85 — 60% 宽旋转 18deg + 起终点 pin）
  routeLine: {
    position: 'absolute',
    top: '30%',
    left: '12%',
    width: '60%',
    height: 4,
    borderRadius: 2,
    transform: [{ rotate: '18deg' }],
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 3,
    shadowOpacity: 0.12,
    elevation: 2,
  },
  routePinStart: {
    position: 'absolute',
    left: -4,
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  routePinEnd: {
    position: 'absolute',
    right: -2,
    top: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  // 骑手（HTML L86-88 — primary 底白 icon + 静态 pulse 光晕，riderLocation 有值才显示）
  riderPulse: {
    position: 'absolute',
    top: '30%',
    left: '48%',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    marginTop: -22,
    marginLeft: -8,
    opacity: 0.35,
    zIndex: 1,
  },
  riderDot: {
    position: 'absolute',
    top: '30%',
    left: '48%',
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: -14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.2,
    elevation: 4,
    zIndex: 2,
  },
  // ETA 浮层（HTML L89-92 — 左上白底胶囊 + 绿点 + 倒计文案）
  etaPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  etaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  etaPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // 比例尺（HTML L93-95 — 右下白底 + 30px 线 + 装饰刻度）
  scaleBar: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scaleLine: {
    width: 30,
    height: 3,
    borderRadius: 2,
  },
  scaleText: {
    fontSize: 9,
    fontWeight: '600',
  },
});
