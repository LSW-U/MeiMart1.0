import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { useLoginPassword } from '@/services/queries/useAuth';
import { useAuthStore } from '@/store/authStore';

export default function LoginPasswordPage() {
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const loginMutation = useLoginPassword();

  const submit = () => {
    if (!phone || !password) {
      Alert.alert('提示', '请填写手机号和密码');
      return;
    }
    loginMutation.mutate(
      { phone, password },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.refreshToken);
          router.replace('/(main)/home');
        },
        onError: () => Alert.alert('登录失败', '请检查手机号和密码'),
      },
    );
  };

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBarConfig />
      <PageHeader title="账号密码登录" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.welcome, { color: colors['on-surface'] }]} accessibilityRole="header">
          欢迎回到 MeiMart
        </Text>
        <Input
          label="手机号"
          placeholder="请输入手机号"
          keyboardType="phone-pad"
          leftIcon="phone"
          value={phone}
          onChangeText={setPhone}
          testID="login-phone"
        />
        <Input
          label="密码"
          placeholder="请输入密码"
          leftIcon="lock"
          rightIcon={showPassword ? 'eye-off' : 'eye'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          testID="login-password"
        />
        <View style={styles.linkRow}>
          <Button
            label="忘记密码？"
            variant="text"
            onPress={() => router.push('/(auth)/reset-password')}
            testID="forgot-password"
          />
        </View>
        <Button
          label="登录"
          variant="primary"
          fullWidth
          loading={loginMutation.isPending}
          onPress={submit}
          testID="login-submit"
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  welcome: { ...typography.h2, fontWeight: '700', marginBottom: spacing.md },
  linkRow: { alignItems: 'flex-end' },
});
