import { StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { useProfile, useUpdateProfile } from '@/services/queries/useUser';
import { FormInput } from '@/forms';
import { profileEditSchema, type ProfileEditValues } from '@/forms/schemas/user';

export default function ProfileEditPage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: user } = useProfile();
  const updateMutation = useUpdateProfile();

  const { control, handleSubmit } = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
    },
    mode: 'onBlur',
  });

  const submit = (values: ProfileEditValues) => {
    updateMutation.mutate(values, {
      onSuccess: () => {
        Alert.alert(t('common.success'), t('profileEdit.saved'));
        router.back();
      },
    });
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
          <FormInput
            control={control}
            name="name"
            label={t('profileEdit.nickname')}
            placeholder={t('profileEdit.nicknamePlaceholder')}
            leftIcon="account"
            testID="edit-name"
          />
          <FormInput
            control={control}
            name="phone"
            label={t('profileEdit.phone')}
            placeholder={t('profileEdit.phonePlaceholder')}
            leftIcon="phone"
            keyboardType="phone-pad"
            testID="edit-phone"
          />
          <FormInput
            control={control}
            name="email"
            label={t('profileEdit.email')}
            placeholder={t('profileEdit.emailPlaceholder')}
            leftIcon="email"
            keyboardType="email-address"
            testID="edit-email"
          />
          <Button
            label={t('common.save')}
            variant="primary"
            fullWidth
            loading={updateMutation.isPending}
            onPress={handleSubmit(submit)}
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
