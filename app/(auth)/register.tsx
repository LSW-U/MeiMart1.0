import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { useRegister } from '@/services/queries/useAuth';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const registerMutation = useRegister();

  const submit = () => {
    if (!phone || !password) {
      Alert.alert('提示', '请填写完整信息');
      return;
    }
    if (password !== confirm) {
      Alert.alert('提示', '两次密码不一致');
      return;
    }
    if (!agreed) {
      Alert.alert('提示', '请先同意用户协议');
      return;
    }
    registerMutation.mutate(
      { phone, password },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.refreshToken);
          router.replace('/(main)/home');
        },
        onError: () => Alert.alert('注册失败', '请稍后重试'),
      },
    );
  };

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBarConfig />
      <PageHeader title="注册新账号" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.welcome, { color: colors['on-surface'] }]} accessibilityRole="header">
          创建你的 MeiMart 账号
        </Text>
        <Input
          label="手机号"
          placeholder="请输入手机号"
          keyboardType="phone-pad"
          leftIcon="phone"
          value={phone}
          onChangeText={setPhone}
          testID="register-phone"
        />
        <Input
          label="密码"
          placeholder="请输入密码（至少 6 位）"
          leftIcon="lock"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          testID="register-password"
        />
        <Input
          label="确认密码"
          placeholder="请再次输入密码"
          leftIcon="lock-check"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          testID="register-confirm"
        />
        <View style={styles.agreement}>
          <Checkbox
            checked={agreed}
            onChange={setAgreed}
            label="我已阅读并同意《用户协议》和《隐私政策》"
            testID="register-agreement"
          />
        </View>
        <Button
          label="注册"
          variant="primary"
          fullWidth
          loading={registerMutation.isPending}
          onPress={submit}
          testID="register-submit"
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  welcome: { ...typography.h2, fontWeight: '700', marginBottom: spacing.md },
  agreement: { paddingVertical: spacing.sm },
});
