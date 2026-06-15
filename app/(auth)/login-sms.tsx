// SmsLoginPage — 还原自 SmsLoginPage.html（191 行）
// 通过 AuthShell 复用外壳，HTML 行数: 191 → RN 行数: ~140
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（外壳行数计入 AuthShell.tsx）
// Fix-16: 替换 PageHeader 为 AuthShell + 手机号 + 验证码 + Husu Kódigu 按钮
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { AuthShell } from '@/components/business/AuthShell';
import { useLoginSms, useSendSmsCode } from '@/services/queries/useAuth';
import { useAuthStore } from '@/store/authStore';

const COUNTDOWN = 60;

export default function LoginSmsPage() {
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [counter, setCounter] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const loginMutation = useLoginSms();
  const sendMutation = useSendSmsCode();

  useEffect(() => {
    if (counter <= 0) return;
    const t = setTimeout(() => setCounter(counter - 1), 1000);
    return () => clearTimeout(t);
  }, [counter]);

  const sendCode = () => {
    if (!phone) {
      Alert.alert('Notice', 'Please enter phone number');
      return;
    }
    sendMutation.mutate(phone, {
      onSuccess: () => {
        setCounter(COUNTDOWN);
        Alert.alert('Sent', 'SMS code sent (Mock: 123456)');
      },
    });
  };

  const submit = () => {
    if (!phone || !code) {
      Alert.alert('Notice', 'Please fill in all fields');
      return;
    }
    if (!agreed) {
      Alert.alert('Notice', 'Please agree to the terms first');
      return;
    }
    loginMutation.mutate(
      { phone, smsCode: code },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.refreshToken);
          router.replace('/(main)/home');
        },
        onError: () => Alert.alert('Sign in failed', 'Invalid SMS code'),
      },
    );
  };

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <AuthShell
        welcomeTitle="Welcome Back"
        welcomeSub="Sign in with phone verification code"
        actionLabel="Sign In"
        onAction={submit}
        loading={loginMutation.isPending}
        secondary={
          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: colors.secondary }]}>
              New to Mei Mart?{' '}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/register')}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Register account"
            >
              <Text style={[styles.registerLink, { color: colors.primary }]}>Register Account</Text>
            </Pressable>
          </View>
        }
        testID="login-sms-page"
      >
        <Input
          label="PHONE NUMBER"
          placeholder="+670 7xx xxxx"
          keyboardType="phone-pad"
          leftIcon="phone"
          value={phone}
          onChangeText={setPhone}
          testID="login-sms-phone"
        />

        <View style={styles.codeRow}>
          <View style={styles.codeInput}>
            <Input
              label="VERIFICATION CODE"
              placeholder="6-digit code"
              keyboardType="number-pad"
              leftIcon="message-text"
              value={code}
              onChangeText={setCode}
              maxLength={6}
              testID="login-sms-code"
            />
          </View>
          <View style={styles.codeBtn}>
            <Button
              label={counter > 0 ? `${counter}s` : 'Husu Kódigu'}
              variant="outline"
              size="sm"
              disabled={counter > 0 || sendMutation.isPending}
              onPress={sendCode}
              testID="login-sms-send"
            />
          </View>
        </View>

        <View style={styles.linkRow}>
          <Pressable
            onPress={() => router.push('/(auth)/login')}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Sign in with password"
          >
            <Text style={[styles.passwordLink, { color: colors.primary }]}>
              Sign in with password
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(auth)/reset-password')}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Forgot password"
          >
            <Text style={[styles.forgotLink, { color: colors.secondary }]}>Forgot Password?</Text>
          </Pressable>
        </View>

        <View style={styles.agreementRow}>
          <Checkbox checked={agreed} onChange={setAgreed} testID="login-sms-agreement" />
          <Text style={[styles.agreementText, { color: colors['on-surface-variant'] }]}>
            {"By logging in, I agree to Mei Mart's "}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              Terms of Service
            </Text> and{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Privacy Policy</Text>.
          </Text>
        </View>
      </AuthShell>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  codeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  codeInput: {
    flex: 1,
  },
  codeBtn: {
    paddingBottom: spacing.xs,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordLink: {
    ...typography['label-caps'],
    textDecorationLine: 'underline',
  },
  forgotLink: {
    ...typography['label-caps'],
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  agreementText: {
    ...typography['body-sm'],
    flex: 1,
    lineHeight: 18,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    ...typography['body-md'],
  },
  registerLink: {
    ...typography['body-md'],
    fontWeight: '700',
  },
});
