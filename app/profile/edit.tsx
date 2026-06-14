import { useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTheme, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { useProfile, useUpdateProfile } from '@/services/queries/useUser';

export default function ProfileEditPage() {
  const { colors } = useTheme();
  const { data: user } = useProfile();
  const updateMutation = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  const submit = () => {
    updateMutation.mutate(
      { name, phone, email },
      {
        onSuccess: () => {
          Alert.alert('成功', '资料已更新');
          router.back();
        },
      },
    );
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title="编辑资料" showBack onBackPress={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Input
            label="昵称"
            placeholder="请输入昵称"
            leftIcon="account"
            value={name}
            onChangeText={setName}
            testID="edit-name"
          />
          <Input
            label="手机号"
            placeholder="请输入手机号"
            leftIcon="phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            testID="edit-phone"
          />
          <Input
            label="邮箱"
            placeholder="请输入邮箱（可选）"
            leftIcon="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            testID="edit-email"
          />
          <Button
            label="保存"
            variant="primary"
            fullWidth
            loading={updateMutation.isPending}
            onPress={submit}
            testID="edit-save"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg },
});
