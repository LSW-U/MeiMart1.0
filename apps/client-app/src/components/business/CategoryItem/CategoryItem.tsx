import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLocalizer } from '@/i18n';
import { useTheme, textStyle, spacing } from '@/theme';
import { toIconName } from '@/types';
import type { CategoryItemProps, CategoryItemSize } from './CategoryItem.types';

// Why: P6 §3 + 模块方案 §3 - SIZE_MAP md 48->56 圆形
//   方案 §3 文字写"方形 radius 16/14/20"与 §1.3.1 V1a"56px 圆形"矛盾，
//   以 HTML 原型 L59 `border-radius:50%` 为准 -> 圆形（radius = box/2）
export const SIZE_MAP = {
  sm: { box: 48, icon: 24, fontSize: 11 },
  md: { box: 56, icon: 28, fontSize: 10 },
  lg: { box: 72, icon: 36, fontSize: 14 },
} as const;

// C-P2-10: React.memo——分类网格项重渲隔离（props 浅比较）
export const CategoryItem = memo(function CategoryItem({
  category,
  size = 'md',
  onPress,
  testID,
}: CategoryItemProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // 原因：批1 A4 透传后 Category.name 是 LocalizableText，渲染层 localize() 取值
  const localize = useLocalizer();
  const dims = SIZE_MAP[size];
  // Why: C2b - 图标盒白底（替代 secondary-container / category.color），无图时图标用 primary 色
  const bgColor = colors['surface-container-lowest'];
  const borderColor = category.borderColor ?? 'transparent';
  const [imageError, setImageError] = useState(false);
  // C-P2-3: 同实例换图（列表复用）重置错误态——上一张失败不卡新图（SafeImage 同款渲染期 setState 先例）
  const [prevImage, setPrevImage] = useState(category.image);
  if (prevImage !== category.image) {
    setPrevImage(category.image);
    setImageError(false);
  }
  const hasImage = Boolean(category.image) && !imageError;
  const iconColor = colors.primary;
  const badgeColor = category.badge === 'hot' ? colors.primary : colors.semantic.positive;

  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress ? () => onPress(category) : undefined}
      accessibilityRole="button"
      accessibilityLabel={t('product.a11y.category', { name: localize(category.name) })}
    >
      <View
        style={[
          styles.iconBox,
          {
            width: dims.box,
            height: dims.box,
            borderRadius: dims.box / 2,
            backgroundColor: bgColor,
            borderColor,
            borderWidth: 1,
            overflow: 'hidden',
          },
        ]}
      >
        {hasImage ? (
          <Image
            source={{ uri: category.image }}
            style={styles.image}
            accessible={false}
            testID={testID ? `${testID}-image` : 'category-item-image'}
            onError={() => setImageError(true)}
          />
        ) : (
          // Why: 无 image 或加载失败时显示 fallback 图标
          // category.icon 保留作矢量图标名备用（W8 再定），无值时走 'tag'
          <MaterialCommunityIcons
            name={category.icon ? toIconName(category.icon) : 'tag'}
            size={dims.icon}
            color={iconColor}
          />
        )}
      </View>
      {/* Why: P6 §2.3 角标 - category.badge 驱动，NEW=positive 绿 / HOT=primary 红 */}
      {category.badge && (
        <View
          style={[
            styles.badge,
            { backgroundColor: badgeColor, borderColor: colors['surface-container-lowest'] },
          ]}
        >
          <Text style={styles.badgeText}>
            {/* 原因：白字 on 红/绿 badge 底，dark 不变（ON_PRIMARY 模式，P6 §2.3） */}
            {/* B-P2-5: HOT/NEW 走 t()——badgeHot 新增，badgeNew 复用 common.badgeNew（en 值同为 NEW） */}
            {category.badge === 'hot' ? t('common.badgeHot') : t('common.badgeNew')}
          </Text>
        </View>
      )}
      <Text
        style={[
          textStyle('body-sm'),
          { color: colors['on-surface'], fontSize: dims.fontSize },
          styles.label,
        ]}
        numberOfLines={1}
      >
        {localize(category.name)}
      </Text>
    </Pressable>
  );
});

// Why: P6 V1f 溢出 - MoreItem 与 CategoryItem 同尺寸（复用 SIZE_MAP），不消费 category 数据
export function MoreItem({
  size = 'md',
  onPress,
  testID,
}: {
  size?: CategoryItemSize;
  onPress?: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const dims = SIZE_MAP[size];
  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('common.more')}
    >
      <View
        style={[
          styles.iconBox,
          {
            width: dims.box,
            height: dims.box,
            borderRadius: dims.box / 2,
            backgroundColor: colors['secondary-container'],
          },
        ]}
      >
        <MaterialCommunityIcons name="apps" size={dims.icon} color={colors['on-surface-variant']} />
      </View>
      <Text
        style={[
          textStyle('body-sm'),
          { color: colors['on-surface-variant'], fontSize: dims.fontSize },
          styles.label,
        ]}
        numberOfLines={1}
      >
        {t('common.more')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
    minWidth: 76,
  },
  // Why: P6 A2 - 按压 scale(0.92) 替代 opacity 0.7（触觉反馈）
  pressed: { transform: [{ scale: 0.92 }] },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  // Why: P6 §2.3 角标 - absolute top:-2 right:-2，7px 700 白字，1.5px surface-lowest 边框
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 7,
    fontWeight: '700',
  },
  label: {
    textAlign: 'center',
  },
});
