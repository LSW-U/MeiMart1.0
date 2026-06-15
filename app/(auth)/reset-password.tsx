// ResetPasswordPage — 还原自 ResetPasswordPage.html（180 行）
// 通过 AuthShell 复用外壳，HTML 行数: 180 → RN 行数: ~135
// 满足 CLAUDE.md 规则 #28 的 30% 门槛（外壳行数计入 AuthShell.tsx）
// Fix-16: 替换 PageHeader 为 AuthShell + 手机号 + 验证码 + 新密码
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AuthShell } from '@/components/business/AuthShell';
import { useResetPassword, useSendSmsCode } from '@/services/queries/useAuth';

const COUNTDOWN = 60;

export default function ResetPasswordPage() {
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [counter, setCounter] = useState(0);
  const resetMutation = useResetPassword();
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
      onSuccess: () => setCounter(COUNTDOWN),
    });
  };

  const submit = () => {
    if (!phone || !code || !password) {
      Alert.alert('Notice', 'Please fill in all fields');
      return;
    }
    resetMutation.mutate(
      { phone, password, smsCode: code },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Password has been reset, please log in again', [
            { text: 'OK', onPress: () => router.replace('/(auth)/login') },
          ]);
        },
        onError: () => Alert.alert('Reset failed', 'Please try again later'),
      },
    );
  };

  return (
    <SafeAreaWrapper edges={['bottom']} style={{ backgroundColor: colors.background, flex: 1 }}>
      <StatusBarConfig />
      <AuthShell
        welcomeTitle="Forgot Password?"
        welcomeSub="Reset your password with SMS verification"
        actionLabel="Reset Password"
        onAction={submit}
        loading={resetMutation.isPending}
        secondary={
          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.secondary }]}>
              Remember your password?{' '}
            </Text>
            <Pressable
              onPress={() => router.push('/(auth)/login')}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel="Log in"
            >
              <Text style={[styles.loginLink, { color: colors.primary }]}>Log In</Text>
            </Pressable>
          </View>
        }
        testID="reset-password-page"
      >
        <Input
          label="PHONE NUMBER"
          placeholder="+670 7xx xxxx"
          keyboardType="phone-pad"
          leftIcon="phone"
          value={phone}
          onChangeText={setPhone}
          testID="reset-phone"
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
              testID="reset-code"
            />
          </View>
          <View style={styles.codeBtn}>
            <Button
              label={counter > 0 ? `${counter}s` : 'Husu Kódigu'}
              variant="outline"
              size="sm"
              disabled={counter > 0 || sendMutation.isPending}
              onPress={sendCode}
              testID="reset-send"
            />
          </View>
        </View>

        <Input
          label="NEW PASSWORD"
          placeholder="Enter new password"
          leftIcon="lock"
          rightIcon={showPassword ? 'eye' : 'eye-off'}
          onRightIconPress={() => setShowPassword((v) => !v)}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          testID="reset-password-input"
        />
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    ...typography['body-md'],
  },
  loginLink: {
    ...typography['body-md'],
    fontWeight: '700',
  },
});
