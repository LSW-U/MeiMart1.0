// MapPickPage — 还原自 MapPickPage.html（250 行）
// HTML 行数 250 → RN ~310（含样式），满足 CLAUDE.md 规则 #28 的 30% 门槛
// Fix-22: PrimaryHeader + tais-pattern + my_location/search/location_on/location_city/info + map image + pin overlay + nearby POIs
import { StyleSheet, View, Text, Pressable, ScrollView, Image, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';

const MAP_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBrBlz0t4Xye-Idd-bo1fQyerd6mU_zw8_X50qYJD1a83k9PDIjBA7junBX8kBzu9FdiEKHLHFH6qo93wFYLHNSl7aqlk4CxHzyRGGdjRm9UxPiAPhHpY_qWm6id6gnwgvOvvyRa7QB-Wv3tg5xagfCaiGEs7NjoUHtjgiMXnDKUDl7ZnXXIRL7fWteZCLuUye8eDhkv3Lw7q0XZaElkxMwu6TDiyl9Ix3fQazwGn9DAfPmh9Rlsu6jonkflEfRFQsTUvR8Fnn2';

interface NearbyPlace {
  id: string;
  name: string;
  nameEn: string;
  distance: string;
}

const NEARBY_PLACES: NearbyPlace[] = [
  { id: 'p1', name: 'Dili City Center', nameEn: 'Centru Dili', distance: '0.5 km' },
  { id: 'p2', name: 'Universidade Dili', nameEn: 'University', distance: '1.2 km' },
  { id: 'p3', name: 'Cristo Rei Statue', nameEn: 'Statue of Christ', distance: '2.8 km' },
  { id: 'p4', name: 'Dili Port', nameEn: 'Port Dili', distance: '3.5 km' },
  { id: 'p5', name: 'Tais Market', nameEn: 'Markadu Tais', distance: '0.9 km' },
];

export default function MapPickPage() {
  const { colors } = useTheme();

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <StatusBarConfig />
      <Header title="Add New Address" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 地图区（HTML 第 159-182 行 — image + floating search + center pin + controls） */}
        <View style={styles.mapWrap}>
          <Image source={{ uri: MAP_IMAGE }} style={styles.mapImage} />

          {/* Floating search bar（HTML 第 162-168 行） */}
          <View style={styles.searchFloat}>
            <View
              style={[styles.searchBox, { backgroundColor: colors['surface-container-lowest'] }]}
            >
              <Icon symbol="search" size={20} color={colors.secondary} />
              <TextInput
                style={[styles.searchInput, { color: colors['on-surface'] }]}
                placeholder="Search for location..."
                placeholderTextColor={colors['on-surface-variant']}
                testID="map-search"
              />
            </View>
          </View>

          {/* 中心 pin overlay（HTML 第 169-175 行） */}
          <View style={styles.pinOverlay} pointerEvents="none">
            <View style={styles.pinCol}>
              <Icon symbol="location_on" size={48} color={colors.primary} />
              <View style={[styles.pinDot, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
            </View>
          </View>

          {/* Map controls（HTML 第 176-181 行 — my_location button） */}
          <View style={styles.controls}>
            <Pressable
              onPress={() => {
                /* TODO: navigator.geolocation */
              }}
              style={({ pressed }) => [
                styles.controlBtn,
                { backgroundColor: colors['surface-container-lowest'] },
                pressed && { transform: [{ scale: 0.95 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Use current location"
            >
              <Icon symbol="my_location" size={20} color={colors.secondary} />
            </Pressable>
          </View>
        </View>

        {/* Form area（HTML 第 183-222 行 — address preview） */}
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
                  Selected Location
                </Text>
              </View>
              <Text style={[styles.previewCoords, { color: colors['on-surface-variant'] }]}>
                -8.5569°, 125.5603°
              </Text>
            </View>
            <Text style={[styles.previewAddr, { color: colors['on-surface'] }]}>
              Rua de Lecidere, Dili
            </Text>
            <View style={styles.autoHintRow}>
              <Icon symbol="info" size={12} color={colors.secondary} />
              <Text style={[styles.autoHint, { color: colors['on-surface-variant'] }]}>
                AUTOMATICALLY UPDATED FROM MAP PIN
              </Text>
            </View>
          </View>

          {/* NEARBY PLACES 标题（HTML 第 165-166 行风格） */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
              NEARBY PLACES
            </Text>
            <View style={[styles.sectionDivider, { backgroundColor: colors['outline-variant'] }]} />
          </View>

          {/* 附近位置列表 */}
          <View
            style={[
              styles.placeList,
              {
                backgroundColor: colors['surface-container-lowest'],
                borderColor: colors['outline-variant'],
              },
            ]}
          >
            {NEARBY_PLACES.map((place, idx) => (
              <Pressable
                key={place.id}
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.placeRow,
                  idx > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors['outline-variant'],
                  },
                  { opacity: pressed ? 0.6 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${place.name}`}
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
                  <Text style={[styles.placeName, { color: colors['on-surface'] }]}>
                    {place.name}
                  </Text>
                  <Text style={[styles.placeSub, { color: colors['on-surface-variant'] }]}>
                    {place.nameEn} • {place.distance}
                  </Text>
                </View>
                <Icon symbol="radio_button_unchecked" size={18} color={colors['outline-variant']} />
              </Pressable>
            ))}
          </View>

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

      {/* SAVE ADDRESS 底部按钮（HTML 第 234-239 行） */}
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
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary },
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Confirm and save address"
        >
          <Text style={styles.saveBtnText}>CONFIRM LOCATION</Text>
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

// PrimaryHeader
function Header({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="header">
      <View style={[styles.trackerBar, { backgroundColor: colors.primary }]}>
        <Text style={styles.trackerText}>MANAGE YOUR ADDRESSES</Text>
      </View>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerPattern} pointerEvents="none">
          <TaisPattern width={390} height={72} opacity={0.2} />
        </View>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon symbol="arrow_back" size={24} color="#ffffff" />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable
            onPress={() => router.push('/service/help')}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Help"
          >
            <Icon symbol="help_outline" size={24} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  trackerBar: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  header: {
    position: 'relative',
    height: 72,
    overflow: 'hidden',
    paddingHorizontal: spacing['container-margin'],
    justifyContent: 'center',
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 20,
  },
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
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  searchFloat: {
    position: 'absolute',
    top: spacing['container-margin'],
    left: spacing['container-margin'],
    right: spacing['container-margin'],
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
    padding: spacing['container-margin'],
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
    padding: spacing['container-margin'],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    height: 52,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    ...typography['body-md'],
    fontWeight: '700',
    letterSpacing: 1,
  },
});
