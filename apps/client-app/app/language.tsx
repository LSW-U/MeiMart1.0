// LanguagePage - 语言选择页（PrimaryHeader + 说明条 + 三语言卡 + toast 反馈 + 版本底栏，P26 优化）
// 切换走 changeLocale（async）；tet 已启用（Q1=A 拍板，与 SUPPORTED_LOCALES 一致）
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Icon } from '@/components/ui/Icon';
import { useAppStore } from '@/store/appStore';
import { changeLocale, type AppLocale } from '@/i18n';
import { toast } from '@/store/toastStore';
import { APP_VERSION } from '@/utils/appInfo';

interface LanguageItem {
  code: AppLocale;
  label: string;
  native: string;
}

// D1：图标语义统一 language（->translate），不再 per-language 配 icon
// D2：tet 启用（Q1=A 拍板，翻译文件存在且持续补译）
const LANGUAGES: LanguageItem[] = [
  { code: 'zh', label: '中文', native: '中文（简体）' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'tet', label: 'Tetun', native: 'Tetun' },
];

export default function LanguagePage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const locale = useAppStore((s) => s.locale);

  // D6：await 切换完成后再取 t()（toast 用切换后语言文案）+ 500ms 延迟返回让用户看到 toast
  const select = async (item: LanguageItem) => {
    // 点当前已选语言：无操作静默返回（审查 F4——selected 项点击触发导航离开与选中语义不符）
    if (locale === item.code) return;
    await changeLocale(item.code);
    toast.success(t('language.changed'));
    setTimeout(handleBack, 500);
  };

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('language.title')}
        showBack
        onBackPress={handleBack}
        testID="language-back"
      />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* D7 顶部说明条 */}
        <View style={[styles.infoBar, { backgroundColor: colors['surface-container-low'] }]}>
          <Icon symbol="language" size={18} color={colors.primary} />
          <Text style={[styles.infoTxt, { color: colors['on-surface-variant'] }]}>
            {t('language.desc')}
          </Text>
        </View>

        {/* D5：3 静态项 ScrollView + map（FlatList 杀鸡用牛刀已删） */}
        {LANGUAGES.map((item) => {
          const active = locale === item.code;
          return (
            <Pressable
              key={item.code}
              testID={`lang-${item.code}`}
              onPress={() => void select(item)}
              style={({ pressed }) => [
                styles.langCard,
                {
                  backgroundColor: active
                    ? colors['surface-container-high']
                    : colors['surface-container-lowest'],
                  borderColor: active ? colors.primary : 'transparent',
                },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.native}
              accessibilityState={{ selected: active }}
            >
              {/* D3：图标盒 36px 圆底，选中 primary 底白字 */}
              <View
                style={[
                  styles.langIcon,
                  { backgroundColor: active ? colors.primary : colors['surface-container-low'] },
                ]}
              >
                <Icon
                  symbol="language"
                  size={20}
                  color={active ? colors['on-primary'] : colors['on-surface-variant']}
                />
              </View>
              <View style={styles.langText}>
                <Text
                  style={[
                    styles.langName,
                    { color: active ? colors.primary : colors['on-surface'] },
                  ]}
                >
                  {item.label}
                </Text>
                <Text style={[styles.langNative, { color: colors['on-surface-variant'] }]}>
                  {item.native}
                </Text>
              </View>
              {/* D3：选中 primary 实心圆 + 白 check（22px） */}
              {active && (
                <View style={[styles.langCheck, { backgroundColor: colors.primary }]}>
                  <Icon symbol="check" size={14} color={colors['on-primary']} />
                </View>
              )}
            </Pressable>
          );
        })}

        {/* D8 底部版本/地区小字（版本单一数据源 appInfo，地区随语言切换）；两行独立 Text（审查 F6，a11y 停顿+可测） */}
        <View style={styles.footNote}>
          <Text style={[styles.footRegion, { color: colors['on-surface-variant'] }]}>
            {`MeiMart · ${t('language.region')}`}
          </Text>
          <Text style={[styles.footVersion, { color: colors['on-surface-variant'] }]}>
            {`v${APP_VERSION}`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.md, gap: spacing.sm },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  infoTxt: {
    flex: 1,
    ...typography['body-sm'],
    lineHeight: 18,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.md,
    minHeight: 60,
    borderWidth: 1.5,
  },
  langIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langText: { flex: 1 },
  langName: { ...typography['body-md'], fontSize: 16, fontWeight: '600' },
  langNative: { ...typography['body-sm'], marginTop: 2 },
  langCheck: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footNote: {
    alignItems: 'center',
    gap: 2,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  footRegion: {
    ...typography['body-sm'],
    fontSize: 11,
    lineHeight: 16,
  },
  footVersion: {
    ...typography['body-sm'],
    fontSize: 11,
    lineHeight: 16,
  },
});
