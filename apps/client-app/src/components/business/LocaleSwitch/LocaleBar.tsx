// LocaleBar — auth 页底部的语言切换条
// 严格还原 P29 HTML 原型 .locale-bar：三语言平铺链接（当前项 primary 高亮），
// 顶边细线分隔，替代原 LocaleSwitch 的单按钮循环切换（点击直达而非循环）
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, typography } from '@/theme';
import { changeLocale, SUPPORTED_LOCALES, type AppLocale } from '@/i18n';

// 语言显示名（原生语言呈现，与 P26 语言页一致）
const LOCALE_DISPLAY: Record<AppLocale, string> = {
  zh: '中文',
  en: 'English',
  tet: 'Tetun',
};

export function LocaleBar() {
  const { colors } = useTheme();
  const { i18n } = useTranslation();

  const current = (SUPPORTED_LOCALES.includes(i18n.language as AppLocale)
    ? i18n.language
    : 'en') as AppLocale;

  return (
    <View
      style={[styles.bar, { borderTopColor: colors['outline-variant'] }]}
      accessibilityRole="tablist"
    >
      {SUPPORTED_LOCALES.map((loc) => {
        const active = loc === current;
        return (
          <Pressable
            key={loc}
            onPress={() => void changeLocale(loc)}
            hitSlop={8}
            disabled={active}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            testID={`locale-bar-${loc}`}
          >
            <Text
              style={[
                styles.link,
                {
                  color: active ? colors.primary : colors['on-surface-variant'],
                  fontWeight: active ? '700' : '400',
                },
              ]}
            >
              {LOCALE_DISPLAY[loc]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // .locale-bar{justify-content:center;gap:16px;padding:12px 0 12px+safe-area;border-top:1px solid outline}
  bar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
  // .locale-bar a{font-size:12px}
  link: {
    ...typography['body-sm'],
    fontSize: 12,
  },
});
