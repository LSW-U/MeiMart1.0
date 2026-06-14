import { StyleSheet, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export default function SettingsPage() {
  const { colors } = useTheme();
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const locale = useAppStore((s) => s.locale);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const setMode = (mode: 'light' | 'dark' | 'system') => setThemeMode(mode);

  const clearCache = () => Alert.alert('提示', '已清除缓存');
  const logout = () => {
    Alert.alert('确认退出', '确定退出登录？', [
      { text: '取消', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBarConfig />
      <PageHeader title="设置" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionTitle title="外观" color={colors['on-surface-variant']} />
        <Card>
          <RowItem
            label="主题"
            icon="palette"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="settings-theme"
          >
            <SegmentSwitch
              value={themeMode}
              onChange={setMode}
              color={colors.primary}
              subColor={colors['on-surface-variant']}
              activeColor={colors['surface-container-low']}
            />
          </RowItem>
        </Card>

        <SectionTitle title="通用" color={colors['on-surface-variant']} />
        <Card>
          <PressableRow
            label="语言"
            icon="translate"
            value={locale === 'zh' ? '中文' : locale === 'en' ? 'English' : locale.toUpperCase()}
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="settings-language"
            onPress={() => router.push('/language')}
          />
          <RowItem
            label="消息推送"
            icon="bell"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
          >
            <Switch value onValueChange={() => {}} />
          </RowItem>
          <PressableRow
            label="清除缓存"
            icon="broom"
            value="1.2 MB"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="settings-cache"
            onPress={clearCache}
          />
        </Card>

        <SectionTitle title="关于" color={colors['on-surface-variant']} />
        <Card>
          <PressableRow
            label="版本"
            icon="information"
            value="v1.0.0"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="settings-version"
            onPress={() => {}}
          />
          <PressableRow
            label="用户协议"
            icon="file-document"
            color={colors.primary}
            textColor={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="settings-tos"
            onPress={() => {}}
          />
        </Card>

        <Pressable
          testID="settings-logout"
          onPress={logout}
          style={({ pressed }) => [
            styles.logout,
            { backgroundColor: colors['surface-container-low'], opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.logoutText, { color: colors.error }]}>退出登录</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return <Text style={[styles.sectionTitle, { color }]}>{title}</Text>;
}

function RowItem({
  label,
  icon,
  color,
  textColor,
  subColor,
  children,
  testID,
}: {
  label: string;
  icon: IconName;
  color: string;
  textColor: string;
  subColor: string;
  children?: ReactNode;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.row, { borderBottomColor: subColor }]}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <View style={styles.right}>{children}</View>
    </View>
  );
}

function PressableRow({
  label,
  icon,
  value,
  color,
  textColor,
  subColor,
  onPress,
  testID,
}: {
  label: string;
  icon: IconName;
  value?: string;
  color: string;
  textColor: string;
  subColor: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: subColor, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <View style={styles.right}>
        {value && <Text style={[styles.value, { color: subColor }]}>{value}</Text>}
        <MaterialCommunityIcons name="chevron-right" size={20} color={subColor} />
      </View>
    </Pressable>
  );
}

function SegmentSwitch({
  value,
  onChange,
  color,
  subColor,
  activeColor,
}: {
  value: 'light' | 'dark' | 'system';
  onChange: (v: 'light' | 'dark' | 'system') => void;
  color: string;
  subColor: string;
  activeColor: string;
}) {
  const options: { v: 'light' | 'dark' | 'system'; label: string }[] = [
    { v: 'system', label: '跟随系统' },
    { v: 'light', label: '浅色' },
    { v: 'dark', label: '深色' },
  ];
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const active = value === opt.v;
        return (
          <Pressable
            key={opt.v}
            onPress={() => onChange(opt.v)}
            style={[styles.segmentItem, { backgroundColor: active ? color : activeColor }]}
          >
            <Text
              style={{
                color: active ? color : subColor,
                ...typography['label-caps'],
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md },
  sectionTitle: {
    ...typography['label-caps'],
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { ...typography['body-md'], flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  value: { ...typography['body-sm'] },
  segment: { flexDirection: 'row', gap: 4 },
  segmentItem: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 6 },
  logout: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  logoutText: { ...typography['body-md'], fontWeight: '600' },
});
