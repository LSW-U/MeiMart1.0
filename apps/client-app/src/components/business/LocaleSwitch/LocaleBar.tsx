// LocaleBar — auth 页底部的语言切换条
// 严格还原 P29 HTML 原型 .locale-bar：语言平铺链接（当前项 primary 高亮），
// 顶边细线分隔，替代原 LocaleSwitch 的单按钮循环切换（点击直达而非循环）
// 语言项由 src/i18n LANGUAGE_REGISTRY 单一注册表驱动（批B 收敛），本组件只渲染 enabled 项
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, typography } from '@/theme';
import { changeLocale, ENABLED_LANGUAGES, type AppLocale } from '@/i18n';

export function LocaleBar() {
  const { colors } = useTheme();
  const { i18n } = useTranslation();

  const current = (
    ENABLED_LANGUAGES.some((l) => l.code === i18n.language) ? i18n.language : 'en'
  ) as AppLocale;

  return (
    <View
      style={[styles.bar, { borderTopColor: colors['outline-variant'] }]}
      accessibilityRole="tablist"
    >
      {ENABLED_LANGUAGES.map(({ code, label }) => {
        const active = code === current;
        return (
          <Pressable
            key={code}
            onPress={() => void changeLocale(code)}
            hitSlop={8}
            disabled={active}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            testID={`locale-bar-${code}`}
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
              {label}
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
