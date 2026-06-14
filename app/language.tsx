import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAppStore } from '@/store/appStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface LanguageItem {
  code: string;
  label: string;
  native: string;
  icon: string;
}

const LANGUAGES: LanguageItem[] = [
  { code: 'zh', label: '中文', native: '中文（简体）', icon: 'account' },
  { code: 'en', label: 'English', native: 'English', icon: 'alphabetical' },
  { code: 'pt', label: 'Português', native: 'Português', icon: 'alphabetical' },
  { code: 'tet', label: 'Tetun', native: 'Tetun', icon: 'alphabetical' },
];

export default function LanguagePage() {
  const { colors } = useTheme();
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);

  const select = (code: string) => {
    setLocale(code);
    if (router.canGoBack()) router.back();
  };

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBarConfig />
      <PageHeader
        title="选择语言"
        showBack
        onBackPress={() => router.back()}
        testID="language-back"
      />
      <FlatList
        data={LANGUAGES}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const active = locale === item.code;
          return (
            <Pressable
              testID={`lang-${item.code}`}
              onPress={() => select(item.code)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: colors['surface-container-low'], opacity: pressed ? 0.7 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.native}
              accessibilityState={{ selected: active }}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={20}
                color={colors['on-surface-variant']}
              />
              <View style={styles.textCol}>
                <Text style={[styles.label, { color: colors['on-surface'] }]}>{item.label}</Text>
                <Text style={[styles.sub, { color: colors['on-surface-variant'] }]}>
                  {item.native}
                </Text>
              </View>
              {active && <MaterialCommunityIcons name="check" size={20} color={colors.primary} />}
            </Pressable>
          );
        }}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.md, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.md,
    minHeight: 56,
  },
  textCol: { flex: 1 },
  label: { ...typography['body-md'], fontWeight: '600' },
  sub: { ...typography['body-sm'] },
});
