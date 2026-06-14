import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing, typography } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { useLoginSms, useSendSmsCode } from '@/services/queries/useAuth';
import { useAuthStore } from '@/store/authStore';

const COUNTDOWN = 60;

export default function LoginSmsPage() {
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [counter, setCounter] = useState(0);
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
      Alert.alert('提示', '请填写手机号');
      return;
    }
    sendMutation.mutate(phone, {
      onSuccess: () => {
        setCounter(COUNTDOWN);
        Alert.alert('已发送', '短信验证码已发送（Mock：123456）');
      },
    });
  };

  const submit = () => {
    if (!phone || !code) {
      Alert.alert('提示', '请填写完整信息');
      return;
    }
    loginMutation.mutate(
      { phone, smsCode: code },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.refreshToken);
          router.replace('/(main)/home');
        },
        onError: () => Alert.alert('登录失败', '验证码错误'),
      },
    );
  };

  return (
    <SafeAreaWrapper style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBarConfig />
      <PageHeader title="短信验证码登录" showBack onBackPress={() => router.back()} />
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
          testID="sms-phone"
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
              testID="sms-code"
            />
          </View>
          <View style={styles.codeBtn}>
            <Button
              label={counter > 0 ? `${counter}s` : '发送'}
              variant="outline"
              size="sm"
              disabled={counter > 0 || sendMutation.isPending}
              onPress={sendCode}
              testID="sms-send"
            />
          </View>
        </View>
        <Button
          label="登录"
          variant="primary"
          fullWidth
          loading={loginMutation.isPending}
          onPress={submit}
          testID="sms-submit"
        />
      </ScrollView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  welcome: { ...typography.h2, fontWeight: '700', marginBottom: spacing.md },
  codeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  codeInput: { flex: 1 },
  codeBtn: { paddingBottom: spacing.xs },
});
