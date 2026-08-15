// MapPickPage — 还原自 MapPickPage.html（250 行）
// HTML 行数 250 → RN ~530（含样式），满足 CLAUDE.md 规则 #28 的 30% 门槛
// Fix-22: PrimaryHeader + tais-pattern + my_location/search/location_on/location_city/info + map + pin overlay + nearby POIs
// P16 决策 4 地图真实化：react-native-maps（native，激活已装依赖）+ expo-location GPS +
//   OSM Nominatim 搜索/反地理 + Overpass 附近位置 + 选址回传（B3 断裂修复）。
//   Web 端 react-native-maps 不可用（风险 3）：降级为「搜索结果列表选点」，共享同一套选点/回传逻辑。
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, layout, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader/PrimaryHeader';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/store/toastStore';
import { useMapPickStore } from '@/store/mapPickStore';
import {
  fetchNearbyPlaces,
  reverseGeocode,
  searchPlaces,
  type GeoHit,
  type NearbyPlaceResult,
} from '@/services/geocode';

// Why: MapView 仅 native 平台加载（react-native-maps 不支持 Web，风险 3）。
//      静态 import 会破坏 Web 打包，require 是唯一按平台条件加载的手段。
// eslint-disable-next-line @typescript-eslint/no-require-imports -- 原因：Web 端不能静态引入 react-native-maps（其 web 支持已移除），条件 require 是 Expo 官方推荐的平台分支加载方式
const MapView = Platform.OS === 'web' ? null : require('react-native-maps').default;

// 未定位时的默认视野（帝力市中心）
const DILI_REGION = { lat: -8.5569, lng: 125.5603 };

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

export default function MapPickPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const setPick = useMapPickStore((s) => s.setPick);

  const [coords, setCoords] = useState(DILI_REGION);
  const [previewAddr, setPreviewAddr] = useState('');
  // Why: 反地理完成坐标（派生 geoLoading，避免 effect 体内同步 setState 触发级联渲染）
  const [resolvedCoords, setResolvedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<GeoHit[] | null>(null);
  const [nearby, setNearby] = useState<NearbyPlaceResult[]>([]);
  // Why: 拖动地图会连续触发反地理/附近查询，用序号丢弃过期响应（只保留最后一次）
  const geoSeq = useRef(0);

  // Why: 反地理中 = 当前坐标还没被 resolve（派生值，setState 只发生在异步回调里）
  const geoLoading =
    !resolvedCoords || resolvedCoords.lat !== coords.lat || resolvedCoords.lng !== coords.lng;

  // 坐标变化 → 反地理编码（preview 卡片地址）+ 附近位置刷新
  useEffect(() => {
    const seq = ++geoSeq.current;
    let cancelled = false;
    const resolved = { lat: coords.lat, lng: coords.lng };
    reverseGeocode(coords.lat, coords.lng)
      .then((addr) => {
        if (!cancelled && seq === geoSeq.current) {
          setPreviewAddr(addr);
          setResolvedCoords(resolved);
        }
      })
      .catch(() => {
        // 反地理失败不清空旧地址，preview 退化为只显示坐标提示
        if (!cancelled && seq === geoSeq.current) {
          setPreviewAddr('');
          setResolvedCoords(resolved);
        }
      });
    fetchNearbyPlaces(coords.lat, coords.lng)
      .then((places) => {
        if (!cancelled && seq === geoSeq.current) setNearby(places);
      })
      .catch(() => {
        // Overpass 失败（超时/限流）静默降级：附近位置区显示空提示
        if (!cancelled && seq === geoSeq.current) setNearby([]);
      });
    return () => {
      cancelled = true;
    };
  }, [coords]);

  // GPS 定位（my_location 按钮，B2 的 TODO 落地）
  const handleLocate = useCallback(async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        toast.info(
          t('address.locationPermissionDenied', { defaultValue: 'Location permission denied' }),
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      toast.error(t('address.locateFailed', { defaultValue: 'Failed to get your location' }));
    } finally {
      setLocating(false);
    }
  }, [t]);

  // 搜索（R6 落地）：Nominatim 关键词搜索（限东帝汶视野）
  const handleSearch = useCallback(async () => {
    const q = searchText.trim();
    if (!q) return;
    setSearching(true);
    try {
      const hits = await searchPlaces(q);
      setSearchHits(hits);
      if (hits.length === 0) {
        toast.info(t('address.searchNoResults', { defaultValue: 'No results' }));
      }
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setSearching(false);
    }
  }, [searchText, t]);

  const applyHit = (hit: GeoHit) => {
    setCoords({ lat: hit.lat, lng: hit.lng });
    setSearchHits(null);
    setSearchText('');
  };

  // Why: 附近位置点选用 POI 自己的坐标 + POI 名（比中心点反地理更准），直接确认回传
  const applyNearbyPlace = (place: NearbyPlaceResult) => {
    setPick({ lat: place.lat, lng: place.lng, address: place.name });
    router.back();
  };

  // B3 修复：确认位置 → 写中转 store + back()，edit.tsx 订阅回填 detail/lat/lng
  const handleConfirm = () => {
    setPick({
      lat: coords.lat,
      lng: coords.lng,
      address: previewAddr || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`,
    });
    router.back();
  };

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('address.pickOnMap', { defaultValue: 'Pick on map' })}
        showBack
        onBackPress={handleBack}
        rightActions={
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.help')}
          >
            <Icon symbol="help_outline" size={24} color={colors['on-primary']} />
          </Pressable>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 地图区（HTML 第 159-182 行 — 交互地图 + floating search + center pin + controls） */}
        <View style={styles.mapWrap}>
          {MapView ? (
            <MapView
              style={styles.mapView}
              initialRegion={{
                latitude: DILI_REGION.lat,
                longitude: DILI_REGION.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onRegionChangeComplete={(region: { latitude: number; longitude: number }) => {
                setCoords({ lat: region.latitude, lng: region.longitude });
              }}
              accessibilityLabel={t('address.a11y.mapArea', { defaultValue: 'Map' })}
            />
          ) : (
            // Web 端降级：无交互地图，靠搜索列表选点
            <View
              style={[styles.webMapFallback, { backgroundColor: colors['surface-container-low'] }]}
            >
              <Icon symbol="location_on" size={40} color={colors['outline-variant']} />
              <Text style={[styles.webMapHint, { color: colors['on-surface-variant'] }]}>
                {t('address.webMapFallback', {
                  defaultValue:
                    'Interactive map is available in the app. Use search to pick a location.',
                })}
              </Text>
            </View>
          )}

          {/* Floating search bar（HTML 第 162-168 行，R6 接 Nominatim） */}
          <View style={styles.searchFloat}>
            <View
              style={[styles.searchBox, { backgroundColor: colors['surface-container-lowest'] }]}
            >
              <Icon symbol="search" size={20} color={colors.secondary} />
              <TextInput
                style={[styles.searchInput, { color: colors['on-surface'] }]}
                placeholder={t('address.searchPlaceholder', {
                  defaultValue: 'Search for location...',
                })}
                placeholderTextColor={colors['on-surface-variant']}
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                testID="map-search"
              />
              {searching && <ActivityIndicator size="small" color={colors.secondary} />}
            </View>
          </View>

          {/* 中心 pin overlay（HTML 第 169-175 行，仅 native 地图上叠加） */}
          {MapView && (
            <View style={styles.pinOverlay} pointerEvents="none">
              <View style={styles.pinCol}>
                <Icon symbol="location_on" size={48} color={colors.primary} />
                <View style={[styles.pinDot, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
              </View>
            </View>
          )}

          {/* Map controls（HTML 第 176-181 行 — my_location 接 expo-location） */}
          <View style={styles.controls}>
            <Pressable
              onPress={handleLocate}
              style={({ pressed }) => [
                styles.controlBtn,
                { backgroundColor: colors['surface-container-lowest'] },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('address.a11y.useCurrentLocation')}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.secondary} />
              ) : (
                <Icon symbol="my_location" size={20} color={colors.secondary} />
              )}
            </Pressable>
          </View>
        </View>

        {/* 搜索结果（R6：搜索有结果时显示在预览卡上方） */}
        {searchHits && searchHits.length > 0 && (
          <View style={styles.formWrap}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
                {t('address.searchResults', { defaultValue: 'Search Results' })}
              </Text>
              <View
                style={[styles.sectionDivider, { backgroundColor: colors['outline-variant'] }]}
              />
            </View>
            <View
              style={[
                styles.placeList,
                {
                  backgroundColor: colors['surface-container-lowest'],
                  borderColor: colors['outline-variant'],
                },
              ]}
            >
              {searchHits.map((hit, idx) => (
                <Pressable
                  key={`${hit.lat},${hit.lng}`}
                  onPress={() => applyHit(hit)}
                  style={({ pressed }) => [
                    styles.placeRow,
                    idx > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors['outline-variant'],
                    },
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={hit.label}
                >
                  <View
                    style={[
                      styles.placeIconWrap,
                      { backgroundColor: colors['surface-container-low'] },
                    ]}
                  >
                    <Icon symbol="search" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.placeInfo}>
                    <Text
                      style={[styles.placeName, { color: colors['on-surface'] }]}
                      numberOfLines={1}
                    >
                      {hit.label.split(',')[0]}
                    </Text>
                    <Text
                      style={[styles.placeSub, { color: colors['on-surface-variant'] }]}
                      numberOfLines={1}
                    >
                      {hit.label}
                    </Text>
                  </View>
                  <Icon symbol="radio_button_unchecked" size={18} color={colors['outline-variant']} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Form area（HTML 第 183-222 行 — 地址预览，坐标/地址实时来自选点） */}
        <View style={styles.formWrap}>
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: colors['surface-container-lowest'],
                borderColor: colors['outline-variant'],
              },
            ]}
          >
            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderLeft}>
                <Icon symbol="location_on" size={20} color={colors.primary} />
                <Text style={[styles.previewTitle, { color: colors['on-surface'] }]}>
                  {t('address.selectedLocation', { defaultValue: 'Selected Location' })}
                </Text>
              </View>
              <Text style={[styles.previewCoords, { color: colors['on-surface-variant'] }]}>
                {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
              </Text>
            </View>
            {geoLoading ? (
              <View style={styles.previewLoadingRow}>
                <ActivityIndicator size="small" color={colors.secondary} />
              </View>
            ) : (
              <Text style={[styles.previewAddr, { color: colors['on-surface'] }]} numberOfLines={2}>
                {previewAddr ||
                  t('address.previewHint', {
                    defaultValue: 'Drag the map or search to pick a location',
                  })}
              </Text>
            )}
            <View style={styles.autoHintRow}>
              <Icon symbol="info" size={12} color={colors.secondary} />
              <Text style={[styles.autoHint, { color: colors['on-surface-variant'] }]}>
                {t('address.autoUpdateHint', {
                  defaultValue: 'Automatically updated from map pin',
                })}
              </Text>
            </View>
          </View>

          {/* NEARBY PLACES（Overpass 真实数据，替换原硬编码 5 条） */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              {t('address.nearbyPlaces', { defaultValue: 'Nearby Places' })}
            </Text>
            <View
              style={[styles.sectionDivider, { backgroundColor: colors['outline-variant'] }]}
            />
          </View>

          {nearby.length > 0 ? (
            <View
              style={[
                styles.placeList,
                {
                  backgroundColor: colors['surface-container-lowest'],
                  borderColor: colors['outline-variant'],
                },
              ]}
            >
              {nearby.map((place, idx) => (
                <Pressable
                  key={place.id}
                  onPress={() => applyNearbyPlace(place)}
                  style={({ pressed }) => [
                    styles.placeRow,
                    idx > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: colors['outline-variant'],
                    },
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={place.name}
                >
                  <View
                    style={[
                      styles.placeIconWrap,
                      { backgroundColor: colors['surface-container-low'] },
                    ]}
                  >
                    <Icon symbol="location_city" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.placeInfo}>
                    <Text
                      style={[styles.placeName, { color: colors['on-surface'] }]}
                      numberOfLines={1}
                    >
                      {place.name}
                    </Text>
                    <Text style={[styles.placeSub, { color: colors['on-surface-variant'] }]}>
                      {formatDistance(place.distanceM)}
                    </Text>
                  </View>
                  <Icon symbol="radio_button_unchecked" size={18} color={colors['outline-variant']} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={[styles.nearbyEmpty, { color: colors['on-surface-variant'] }]}>
              {t('address.nearbyEmpty', { defaultValue: 'No named places nearby' })}
            </Text>
          )}

          {/* Cultural Motif Separator */}
          <View style={styles.motifRow}>
            <View style={[styles.motifLine, { backgroundColor: colors['outline-variant'] }]} />
            <MotifTriangle size={16} color={colors.primary} opacity={1} />
            <MotifTriangle size={24} color={colors.primary} opacity={0.6} />
            <MotifTriangle size={16} color={colors.primary} opacity={1} />
            <View style={[styles.motifLine, { backgroundColor: colors['outline-variant'] }]} />
          </View>
        </View>
      </ScrollView>

      {/* CONFIRM LOCATION 底部按钮（HTML 第 234-239 行 — B3 修复：回传选点给编辑页） */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderTopColor: colors['outline-variant'],
          },
        ]}
      >
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('address.a11y.confirmSave')}
        >
          <Text style={[styles.saveBtnText, { color: colors['on-primary'] }]}>
            {t('address.confirmLocation', { defaultValue: 'Confirm Location' })}
          </Text>
        </Pressable>
      </View>
    </SafeAreaWrapper>
  );
}

// uma-lulik-silhouette triangle
function MotifTriangle({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: size / 2,
        borderRightWidth: size / 2,
        borderBottomWidth: size,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        opacity,
      }}
    />
  );
}

const styles = StyleSheet.create({
  // Map
  scroll: {
    paddingBottom: 120,
  },
  mapWrap: {
    position: 'relative',
    width: '100%',
    height: 280,
    overflow: 'hidden',
  },
  mapView: {
    width: '100%',
    height: '100%',
  },
  webMapFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  webMapHint: {
    ...typography['body-sm'],
    textAlign: 'center',
  },
  searchFloat: {
    position: 'absolute',
    top: layout['container-margin'],
    left: layout['container-margin'],
    right: layout['container-margin'],
    zIndex: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 4,
    fontSize: 15,
  },
  pinOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinCol: {
    alignItems: 'center',
    marginBottom: 40,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -4,
  },
  controls: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    zIndex: 15,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  // Form
  formWrap: {
    padding: layout['container-margin'],
    gap: spacing.lg,
  },
  previewCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.xs,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  previewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewTitle: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  previewCoords: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  previewLoadingRow: {
    minHeight: 24,
    justifyContent: 'center',
  },
  previewAddr: {
    ...typography['body-md'],
    fontWeight: '600',
  },
  autoHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  autoHint: {
    fontSize: 10,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography['label-caps'],
    fontSize: 11,
  },
  sectionDivider: {
    height: 1,
    flex: 1,
  },
  // Places
  placeList: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  placeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeInfo: {
    flex: 1,
    gap: 2,
  },
  placeName: {
    ...typography['body-md'],
    fontWeight: '600',
  },
  placeSub: {
    ...typography['body-sm'],
    fontSize: 12,
  },
  nearbyEmpty: {
    ...typography['body-sm'],
  },
  // Motif
  motifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  motifLine: {
    height: 1,
    flex: 1,
  },
  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: layout['container-margin'],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    height: 52,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    ...typography['body-md'],
    fontWeight: '700',
    letterSpacing: 1,
  },
});
