import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { useResetPassword, useSendSmsCode } from '@/services/queries/useAuth';

const COUNTDOWN = 60;

export default function ResetPasswordPage() {
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
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
      Alert.alert('提示', '请填写手机号');
      return;
    }
    sendMutation.mutate(phone, {
      onSuccess: () => setCounter(COUNTDOWN),
    });
  };

  const submit = () => {
    if (!phone || !code || !password) {
      Alert.alert('提示', '请填写完整信息');
      return;
    }
    resetMutation.mutate(
      { phone, password, smsCode: code },
      {
        onSuccess: () => {
          Alert.alert('成功', '密码已重置，请重新登录', [
            { text: '确定', onPress: () => router.replace('/(auth)/login') },
          ]);
        },
        onError: () => Alert.alert('重置失败', '请稍后重试'),
      },
    );
  };

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBarConfig />
      <PageHeader title="重置密码" showBack onBackPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors['on-surface'] }]} accessibilityRole="header">
          重置你的密码
        </Text>
        <Input
          label="手机号"
          placeholder="请输入手机号"
          keyboardType="phone-pad"
          leftIcon="phone"
          value={phone}
          onChangeText={setPhone}
          testID="reset-phone"
        />
        <View style={styles.codeRow}>
          <View style={styles.codeInput}>
            <Input
              label="验证码"
              placeholder="6 位验证码"
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
              label={counter > 0 ? `${counter}s` : '发送'}
              variant="outline"
              size="sm"
              disabled={counter > 0 || sendMutation.isPending}
              onPress={sendCode}
              testID="reset-send"
            />
          </View>
        </View>
        <Input
          label="新密码"
          placeholder="请设置新密码"
          leftIcon="lock"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          testID="reset-password"
        />
        <Button
          label="重置密码"
          variant="primary"
          fullWidth
          loading={resetMutation.isPending}
          onPress={submit}
          testID="reset-submit"
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  title: { ...typography.h2, fontWeight: '700', marginBottom: spacing.md },
  codeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  codeInput: { flex: 1 },
  codeBtn: { paddingBottom: spacing.xs },
});
