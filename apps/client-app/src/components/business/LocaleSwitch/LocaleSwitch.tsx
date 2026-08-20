// LocaleSwitch — AuthShell 底部的语言切换按钮
// Why: 5 个 auth 页面共用，避免每个页面重复实现
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, typography } from '@/theme';
import { changeLocale, type AppLocale } from '@/i18n';

// Why: 循环切换 zh → en → tet → zh（P29-D9: 加 tet，与 P26 语言页启用 tet 一致）
const LOCALE_CYCLE: AppLocale[] = ['zh', 'en', 'tet'];
const LOCALE_LABEL: Record<AppLocale, string> = {
  zh: '中',
  en: 'EN',
  tet: 'TET',
};

export function LocaleSwitch() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  const current = (i18n.language as AppLocale) ?? 'en';

  const toggle = () => {
    const idx = LOCALE_CYCLE.indexOf(current);
    const next = LOCALE_CYCLE[(idx + 1) % LOCALE_CYCLE.length] ?? 'en';
    void changeLocale(next);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggle}
        hitSlop={8}
        style={({ pressed }) => [
          styles.btn,
          { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('language.title')}
      >
        <MaterialCommunityIcons name="translate" size={16} color={colors.primary} />
        <Text style={[styles.text, { color: colors.primary }]}>
          {LOCALE_LABEL[current] ?? 'EN'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginTop: 16,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    ...typography['label-caps'],
    fontSize: 12,
    fontWeight: '700',
  },
});
