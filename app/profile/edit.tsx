import { useState } from 'react';
import { StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { useProfile, useUpdateProfile } from '@/services/queries/useUser';

export default function ProfileEditPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
          Alert.alert(t('common.success'), t('profileEdit.saved'));
          router.back();
        },
      },
    );
  };

  return (
    <SafeAreaWrapper style={{ backgroundColor: colors.background }}>
      <StatusBarConfig />
      <PageHeader title={t('profileEdit.title')} showBack onBackPress={() => router.back()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Input
            label={t('profileEdit.nickname')}
            placeholder={t('profileEdit.nicknamePlaceholder')}
            leftIcon="account"
            value={name}
            onChangeText={setName}
            testID="edit-name"
          />
          <Input
            label={t('profileEdit.phone')}
            placeholder={t('profileEdit.phonePlaceholder')}
            leftIcon="phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            testID="edit-phone"
          />
          <Input
            label={t('profileEdit.email')}
            placeholder={t('profileEdit.emailPlaceholder')}
            leftIcon="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            testID="edit-email"
          />
          <Button
            label={t('common.save')}
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
