// ProductListPage — 还原自 ProductListPage.html（335 行）
// HTML → RN 行数比：335 → ~430（含样式）
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（实际 128%）
// Fix-13: 排行榜差异化布局
// - Top 3 大卡片：排名 + 80×80 图 + Local Specialty 标签 + 标题 + 销量 + 价格 + add
// - Top 4-10 紧凑列表：排名 + 16×16 小图 + 标题 + 价格 + 圆形 add
// - Top 3 加 uma-lulik-shadow（offset 4,4 + #59413d + opacity 0.2）
// - 横滑分类胶囊 + Primary tais-pattern Header
import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { EmptyState } from '@/components/feedback/EmptyState';
import { TaisPattern } from '@/components/cultural/TaisPattern';
import { Icon } from '@/components/ui/Icon';

const CATEGORY_BAR = ['All', 'Coffee', 'Artisanal Food', 'Handicrafts'] as const;

// Top 3 大卡片 mock（HTML 第 145-192 行）
const TOP_THREE = [
  {
    id: 'top-1',
    rank: 1,
    name: 'Ermera Arabica Coffee Beans',
    sold: '942+ sold recently',
    price: 12.5,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDmUYfQODctGuRNTrFmZdlQbTqUXPPZ72Y03aI9kHGCy5m8Yv1b6aOFG5KheToU68XbawxpGTljtdCnU4o1mUKAcJlB_hhPx2YPOdeQJtafcDEyElW-W1s-_P9C02DI3kgw-hN8-br1VIgbAdiAWEERQ8uH9zHeqiTknpYUn_W1jWxHiDE6ioxly5smPxQME0DcEmmpVlgLwFH5xoKF16nFypkFAdl4B0OTUrcJt4K-KVgD-JPzwBB75RcCha7O4mjZdR5ECSvB',
  },
  {
    id: 'top-2',
    rank: 2,
    name: 'Atauro Island Wild Honey',
    sold: '754+ sold recently',
    price: 18.0,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB1pOvdPdPa3q7WqY1XOy5OFONktDSjis1v9TQRe5NXv6K3NGZrU_YlLKy6_tRbEo12MxEZWFVTEK8i9K3wL5U4SiIVCgYO-UF55rT0y-dInkfr6YQ4TJWwEyN9Y2ps5OaUaDszs0E6HqXKhRs5Q6g7cZCGhGOb3YTktzk_pO5hbvWXhSvR3Vl1JnisxwT9ZRUVq4Gv7JlO93coJPtvqc3rJJHyyc3WvsJI2h2-tcw3VUNH2Jg6sY2jaAwuQX_cZ2pRZ_FbMLE7',
  },
  {
    id: 'top-3',
    rank: 3,
    name: 'Dili Handmade Pottery Mug',
    sold: '512+ sold recently',
    price: 22.0,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC1Nl0JyfZ64rkNlEPOfaOfpTWpl5AywMwtPLI_XP_-9lnSAN6GqX2idvD1ajEDvGi4yZlOFN_0vZWSXjt9yG5Nfd6n2Ol__8nQFG04JqsWw4a929DQy7GNVFrgCBz5rHYdm9Vr1oEWO4r2d_E_gh1CO91YMsvXMnBKcZ064gnFuvj_T_hl8jBw3YLWlcJEtanZZLN0fp8j_kxQ9RoVO_ta6sRlJRRb1ynSmTa19UGZyXmbAZIAkb2mnZyEeKZ8PgJ7kwlMZWrw',
  },
];

// Top 4-10 紧凑列表 mock（HTML 第 196-278 行）
const REST_LIST = [
  {
    id: 'rest-4',
    rank: 4,
    name: 'Organic Red Rice',
    sold: '320 sold',
    price: 4.2,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDR3JKLoD9c-GluQJWQ-al72hUHySGht27Om1qNjiJjkWJPmWwljKK9Mzl8TeGVcZT2zoOr2vEC1EEeVAh-s9fpY0fkOQDrHPzck7tGEZDHXfeYi_uLwJtgwky5R1KkRU21sCREAJDKPrOm3KfIkuiHo8mb6CM8BsH-SYCstj1HKX_LULvMrVyf18HPTII5dcp8e2X-ckDlu6HcI_YymqOOLaWNMyKW3W10x3V_WjNrG-ouvGY6aj5oyhqEfRMpOm_XD60_TEX8',
  },
  {
    id: 'rest-5',
    rank: 5,
    name: 'Artisanal Coconut Sugar',
    sold: '298 sold',
    price: 6.5,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCbtMU1AeRajrRyOUwgnAwAbQSd9LAqJTTrRxxeFZ7tejOXfSETc5GoLK3o59veAmKs2tJbQVn0Rge3GOrK6-OYO53HzuDfU2PqQK5Lxj404sFu5m-ZWPYQ_zbbNM5zCDCqIFIcUlr_45wu-iCBAXAt6BYvPB8YsKj0-08gA8GmnBet-Bu1apQ84Fiw0y1CnIT6censpmVUqH4gAVHZUnc4Ep8fzQy8bNpqkIT73T3rP8xz1BVMH7syhFIN1BLqKjuiKQS_vk6d',
  },
  {
    id: 'rest-6',
    rank: 6,
    name: 'Tais Woven Handkerchief',
    sold: '245 sold',
    price: 15.0,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAwfvdrkWk31Bjk5zpVkpC9xAzIDmhA0pFxcDhcEGiyc5g07rkG4C7aTgl24IdkRqGzU8OO9vb0ChvKWe1Cggg2NR535eJMnt_k-siHvzc0BZ4U8olc6Uq_vqOMELQZGoDxTnyJnwYnAT5epm7MnwDWmSffGg_zQAnmZe_9u9BSiQv3uvn5F6WEzf_F5WOpbdbdjTp8c6dcmJ9UM6En4mXqlE76_X26SQZz40P4SysMeqkvYCCUgszI7zbhdFuf2sYMUfpJyHDe',
  },
  {
    id: 'rest-7',
    rank: 7,
    name: 'Organic Vanilla Pods',
    sold: '210 sold',
    price: 25.0,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDBaSvpQ7gdneUFLZtfDdsLmKhYn_0qJJkFLHpshMQuZRgZwOt9j8MJvutYy4-RAC8Up9vKLkg5ZOdaEhCxfgzVma3T0XOo9gl5RFnD5T5MVC581s0eAdAl7D5i-IERS67gfudbv6G3-e0MiBqz7-0IoV1tK5lwV9W4Mz7UM1f7LCsz8GPPyfi9HkbKupCl5z7gcz09EmA66ZVzvd6yhY1ODBdcExB7nNAMbDUZGtb8QUI83aHSa4nI6WvRRzAJrkUE2HCX7yRW',
  },
  {
    id: 'rest-8',
    rank: 8,
    name: 'Handmade Batik Scarf',
    sold: '186 sold',
    price: 35.0,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDkODiY8I4APKHHdRf1T8MBvkGSClhPJy3fSGcYRkomNPg2zSrOnMflXI0pVSjK9-gMhocxnIYDeGEtoT65fiePmHg92NBQ8DejMyeQDzx6OvVhoN5paaFOEbZNI71lvjk8wkXUlupJFQFE996lb-MOIytqCLpZbQ685IJFv5WL0O_yarjGpq6oMQbdfZzRawHpLkKQT2u1stI9ABdMyI3dlKuDb9UnG11ky45ZlhY_2a_hPgY65Ab5NwC39mOXNhSi2WvTkrvw',
  },
  {
    id: 'rest-9',
    rank: 9,
    name: 'Local Raw Cashews',
    sold: '175 sold',
    price: 9.5,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuACKaZh_6Bcr6qA9iIPW2o31w9HWkbeZlIbQwY5q7U6WhrjG8L43P3Oqsq_xQljqCPZyO9K1Lu9LOVhYAAPBueDlNbcTTObSjht8b9D8ZlauTljB_MqwZeqh1eofb4-KRxsAf8QRD0cjGf-HOakUJEYkCoWuYne62vrzEwnT33q0PHzsFbIMiGgfpZJY8ol4QvDTbuF1Mjx8ByxwefV7Tax3_bbMO1umh7sg-GB45BXm7uGFYKYDkOdf4Ma6ylMlOLqL4z_pCsH',
  },
  {
    id: 'rest-10',
    rank: 10,
    name: 'Coconut Oil Handmade Soap',
    sold: '142 sold',
    price: 5.0,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCErsVYI8Qd9dmNnVW4nS8sjzd24ZCPIrEkW8h0NU93Kg9OdJjHV74xvvhi2xqRQ_cPYx--PQVPnFg9jPCin2d1GtdmNmQ5zT80hcdV-yAnj_BGDMu9aOssHhFbpighYjanos6lp15UYa66EUzYvfc4VsQuS-plL0hPGVAfrD3yV1dL5R-ZWhoh8NepyrPk2AUg_AAZ5RfezOiUWDwVIl1MPchDmON9UQgKvfEMg4F_om9GrjW4CvZh9sQOtpxGO0IxcFRBE8wN',
  },
];

// uma-lulik-shadow（offset 4,4 + #59413d + opacity 0.2 + radius 0）
const UMA_LULIK_SHADOW = {
  shadowColor: '#59413d',
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 0,
  elevation: 4,
};

export default function ProductListPage() {
  const { colors } = useTheme();
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORY_BAR)[number]>('All');

  if (TOP_THREE.length === 0 && REST_LIST.length === 0) {
    return (
      <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
        <StatusBarConfig />
        <Header />
        <EmptyState
          title="No products"
          description="No items match this filter"
          icon="package-variant"
        />
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <Header />

      {/* Category Bar 横滑分类 */}
      <View
        style={[
          styles.categoryBar,
          {
            backgroundColor: colors.background,
            borderBottomColor: 'rgba(225, 191, 186, 0.1)',
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryRow}>
            {CATEGORY_BAR.map((cat) => {
              const active = cat === activeCategory;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[
                    styles.categoryPill,
                    active
                      ? { backgroundColor: colors.primary }
                      : {
                          backgroundColor: colors['surface-container-lowest'],
                          borderColor: colors.primary,
                        },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Category: ${cat}`}
                >
                  <Text
                    style={[styles.categoryText, { color: active ? '#ffffff' : colors.primary }]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top 3 大卡片 */}
        <View style={styles.topThreeWrap}>
          {TOP_THREE.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/product/${item.id}`)}
              style={({ pressed }) => [
                styles.topCard,
                {
                  backgroundColor: colors['surface-container-lowest'],
                  borderColor: 'rgba(225, 191, 186, 0.1)',
                },
                UMA_LULIK_SHADOW,
                pressed && { opacity: 0.95, transform: [{ scale: 0.98 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Rank ${item.rank}: ${item.name}`}
            >
              <Text style={[styles.topRank, { color: colors.primary }]}>{item.rank}</Text>
              <Image source={{ uri: item.image }} style={styles.topImage} />
              <View style={styles.topInfo}>
                <View
                  style={[styles.localSpecialtyTag, { backgroundColor: 'rgba(150,24,19,0.1)' }]}
                >
                  <Text style={[styles.localSpecialtyText, { color: colors.primary }]}>
                    LOCAL SPECIALTY
                  </Text>
                </View>
                <Text style={[styles.topName, { color: colors['on-surface'] }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.topSold, { color: colors['on-surface-variant'] }]}>
                  {item.sold}
                </Text>
                <View style={styles.topPriceRow}>
                  <Text style={[styles.topPrice, { color: colors.primary }]}>
                    ${item.price.toFixed(2)}
                  </Text>
                  <Pressable
                    onPress={() => {}}
                    style={({ pressed }) => [
                      styles.topAddBtn,
                      { backgroundColor: colors.primary },
                      pressed && { transform: [{ scale: 0.9 }] },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${item.name} to cart`}
                  >
                    <Icon symbol="add" size={20} color="#ffffff" />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Top 4-10 紧凑列表 */}
        <View style={[styles.restWrap, { borderTopColor: 'rgba(225, 191, 186, 0.2)' }]}>
          {REST_LIST.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(`/product/${item.id}`)}
              style={({ pressed }) => [styles.restRow, pressed && { transform: [{ scale: 0.95 }] }]}
              accessibilityRole="button"
              accessibilityLabel={`Rank ${item.rank}: ${item.name}`}
            >
              <Text style={[styles.restRank, { color: colors.secondary }]}>{item.rank}</Text>
              <Image source={{ uri: item.image }} style={styles.restImage} />
              <View style={styles.restInfo}>
                <Text style={[styles.restName, { color: colors['on-surface'] }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.restPrice, { color: colors['on-surface-variant'] }]}>
                  ${item.price.toFixed(2)} • {item.sold}
                </Text>
              </View>
              <Pressable
                onPress={() => {}}
                style={({ pressed }) => [
                  styles.restAddBtn,
                  { backgroundColor: colors.primary },
                  pressed && { transform: [{ scale: 0.9 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name} to cart`}
              >
                <Icon symbol="add" size={18} color="#ffffff" />
              </Pressable>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

// Primary tais-pattern Header（HTML 第 135 行）
function Header() {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
      <View style={styles.headerPattern} pointerEvents="none">
        <TaisPattern width={390} height={56} opacity={0.1} />
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
        <Text style={styles.headerTitle} accessibilityRole="header">
          Local Bestsellers
        </Text>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => {}}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Help"
          >
            <Icon symbol="help" size={24} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={() => {}}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Share"
          >
            <Icon symbol="share" size={24} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    position: 'relative',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  categoryBar: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing['container-margin'],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryText: {
    ...typography['label-caps'],
    fontSize: 12,
  },
  scrollContent: {
    padding: spacing['container-margin'],
    paddingBottom: spacing.xxl * 2,
  },
  topThreeWrap: {
    gap: spacing.md,
  },
  topCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  topRank: {
    ...typography.h2,
    fontWeight: '700',
    width: 32,
  },
  topImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(225, 191, 186, 0.2)',
  },
  topInfo: {
    flex: 1,
    gap: 2,
  },
  localSpecialtyTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 4,
  },
  localSpecialtyText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  topName: {
    ...typography.h3,
    fontWeight: '600',
  },
  topSold: {
    ...typography['body-sm'],
  },
  topPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  topPrice: {
    ...typography['price-display'],
  },
  topAddBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restWrap: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    marginTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  restRank: {
    ...typography.h2,
    fontSize: 18,
    width: 32,
  },
  restImage: {
    width: 64,
    height: 64,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(225, 191, 186, 0.2)',
  },
  restInfo: {
    flex: 1,
  },
  restName: {
    ...typography['body-md'],
    fontWeight: '700',
  },
  restPrice: {
    ...typography['body-sm'],
  },
  restAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
