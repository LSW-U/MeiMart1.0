import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, textStyle, spacing, borderRadius } from '@/theme';
import type { ReviewItemProps } from './ReviewItem.types';

export function ReviewItem({ review, onPress, testID }: ReviewItemProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors['surface-container-low'] },
        pressed && styles.pressed,
      ]}
      onPress={onPress ? () => onPress(review) : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Review by ${review.userName}, rating ${review.rating}`}
    >
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors['secondary-container'] }]}>
          <Text
            style={[
              textStyle('body-md'),
              { color: colors['on-secondary-container'], fontWeight: '700' },
            ]}
          >
            {review.userName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={[textStyle('body-md'), { fontWeight: '700', color: colors['on-surface'] }]}>
            {review.userName}
          </Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <MaterialCommunityIcons
                key={star}
                name={star <= Math.round(review.rating) ? 'star' : 'star-outline'}
                size={12}
                color={colors.tertiary}
              />
            ))}
            <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
              {new Date(review.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
      <Text style={[textStyle('body-md'), { color: colors['on-surface'] }]}>{review.content}</Text>
      {review.images && review.images.length > 0 && (
        <View style={styles.imageRow}>
          {review.images.slice(0, 4).map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={[styles.reviewImage, { borderRadius: borderRadius.sm }]}
              accessible={false}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.sm, gap: spacing.xs },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, gap: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  imageRow: { flexDirection: 'row', gap: spacing.xs },
  reviewImage: { width: 80, height: 80 },
});
