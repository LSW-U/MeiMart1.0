// ProfileEditPage — 个人资料编辑页（头像上传 + 行式资料卡 + 手机号只读 + dirty 检测，P27 优化）
// 手机号是登录凭证只读展示（D2，改号单独立项后端 change-phone 已就绪本期不接）；
// submit 排除 phone 字段（D5.1：UI disabled 不跳过 schema 校验，必排防阻断保存）
import { useState } from 'react';
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { Button } from '@/components/ui/Button';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { Icon } from '@/components/ui/Icon';
import { SafeImage } from '@/components/ui/SafeImage';
import { useProfile, useUpdateProfile, PROFILE_QUERY_KEY } from '@/services/queries/useUser';
import { uploadsApi } from '@/services/uploads';
import { toast } from '@/store/toastStore';
import type { User } from '@/types';
import { FormInput } from '@/forms';
import { profileEditSchema, type ProfileEditValues } from '@/forms/schemas/user';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB（D1 拍板：仅大小校验，不装 expo-image-manipulator）

export default function ProfileEditPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: user } = useProfile();
  const updateMutation = useUpdateProfile();
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { control, handleSubmit, formState: { isDirty } } = useForm<ProfileEditValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
    },
    mode: 'onBlur',
  });
  // 字数计数（D5）：useWatch name 实时值（react-compiler 兼容，先例 after-sales-apply.tsx:86）
  const nameDraft = useWatch({ control, name: 'name' }) ?? '';
  // P27 D4：schema 错误信息是 i18n key（profileEdit.*）时翻译显示，其余（历史英文串）直显
  const tError = (msg: string): string => (msg.startsWith('profileEdit.') ? t(msg) : msg);

  // F4：保存失败提取后端错误码翻译，回退 errors.generic（先例 address/edit.tsx:133-143）
  const onMutationError = (error: unknown) => {
    const err = error as {
      response?: { data?: { error?: { code?: string; message?: string } } };
      message?: string;
    };
    const code = err?.response?.data?.error?.code;
    const fallback = err?.response?.data?.error?.message ?? err?.message;
    const translated = code ? t(`errors.${code}`, { defaultValue: fallback }) : fallback;
    toast.error(translated ?? t('errors.generic'));
  };

  // D5.1：phone 只读不提交——UI disabled 不跳过 schema 校验（phoneSchema required），
  // 若 mock 用户 phone 为空/格式不符会阻断保存，必须解构排除
  const submit = (values: ProfileEditValues) => {
    const { phone: _phone, ...rest } = values;
    updateMutation.mutate(rest, {
      onSuccess: () => {
        toast.success(t('profileEdit.saved'));
        handleBack();
      },
      onError: onMutationError,
    });
  };

  // D1：选图即上传即时更新（独立于 form submit，与 review.tsx 先选后传模式不同）
  // F3：mutateAsync await 使上传遮罩覆盖「文件上传 + profile PATCH」完整链路（原 fire-and-forget 遮罩提前消失）
  // F5：头像不共用 useUpdateProfile（避免与 submit 抢同一 mutation 的 onMutate previous 导致并发回滚丢 name/email），
  //     改用独立乐观更新：上传成功后本地 setQueryData 合并 avatar，PATCH 走 useUpdateProfile 但 avatar 已先乐观落地
  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    // 大小校验（≤2MB，超出 toast 拒绝不发起上传）
    if (asset.fileSize != null && asset.fileSize > AVATAR_MAX_BYTES) {
      toast.error(t('profileEdit.avatarTooLarge'));
      return;
    }
    setAvatarUploading(true);
    // 头像乐观落地：上传成功立即合并到 user 缓存（本地，不触发 mutation onMutate 链）
    let previousUser: User | undefined;
    try {
      const uploaded = await uploadsApi.avatar(asset.uri, asset.mimeType ?? 'image/jpeg');
      // F5 本地乐观：先快照 previous 再合并 avatar，PATCH 失败时回滚到 previous
      previousUser = qc.getQueryData<User>(PROFILE_QUERY_KEY);
      if (previousUser) {
        qc.setQueryData<User>(PROFILE_QUERY_KEY, { ...previousUser, avatar: uploaded.url });
      }
      await updateMutation.mutateAsync({ avatar: uploaded.url });
      toast.success(t('profileEdit.saved'));
    } catch {
      // 回滚本地乐观 avatar（F5），再提示
      if (previousUser) qc.setQueryData(PROFILE_QUERY_KEY, previousUser);
      toast.error(t('profileEdit.avatarFailed'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const displayName = user?.name || t('profileEdit.nickname');
  const avatarAlt = t('profileEdit.avatar');

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={{ backgroundColor: colors.background }}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('profileEdit.title')}
        showBack
        onBackPress={handleBack}
        centerTitle
        testID="profile-edit-back"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* 头像区（D1）：96px 金边圆头像 + 相机角标 + 昵称展示 + 更换提示
              dev 反馈：背景与页面一致（去掉 surface-container-low 色块）、不显手机号与格式提示行 */}
          <View style={styles.avatarZone}>
            <Pressable
              onPress={() => void handlePickAvatar()}
              style={styles.avatarWrap}
              accessibilityRole="button"
              accessibilityLabel={avatarAlt}
              testID="edit-avatar"
            >
              <View
                style={[
                  styles.avatarImg,
                  { backgroundColor: colors['surface-container-high'] },
                ]}
              >
                {/* F1：有 avatar URL 渲染图片（SafeImage 带加载失败兜底），无 URL 时首字母/icon fallback */}
                {user?.avatar ? (
                  <SafeImage
                    source={{ uri: user.avatar }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                    fallback={<Text style={styles.avatarFallbackText}>{displayName.slice(0, 1)}</Text>}
                    accessibilityLabel={avatarAlt}
                  />
                ) : (
                  <Text style={styles.avatarFallbackText}>{displayName.slice(0, 1)}</Text>
                )}
              </View>
              {/* 相机角标：白底 + primary 图标（对齐原型 .avatar-cam） */}
              <View
                style={[
                  styles.avatarCam,
                  { backgroundColor: colors['surface-container-lowest'], borderColor: colors['primary-container'] },
                ]}
              >
                <Icon symbol="photo_camera" size={17} color={colors.primary} />
              </View>
              {/* 上传 loading 遮罩（D1：ActivityIndicator 降级，原型为旋转图标；F7：加文字 avatarUploading） */}
              {avatarUploading && (
                <View style={styles.avatarMask}>
                  <ActivityIndicator color={colors['on-primary']} size="small" />
                  <Text style={[styles.avatarMaskText, { color: colors['on-primary'] }]}>
                    {t('profileEdit.avatarUploading')}
                  </Text>
                </View>
              )}
            </Pressable>
            <Text style={[styles.avatarName, { color: colors['on-surface'] }]}>{displayName}</Text>
            <View style={styles.avatarHintRow}>
              <Icon symbol="photo_camera" size={12} color={colors['on-surface-variant']} />
              <Text style={[styles.avatarHint, { color: colors['on-surface-variant'] }]}>
                {t('profileEdit.avatarHint')}
              </Text>
            </View>
          </View>

          {/* 基本信息（D3）：昵称（可编辑行）+ 邮箱（选填） */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
              {t('profileEdit.sectionBasic')}
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors['surface-container-lowest'] },
                shadowPresets.sm,
              ]}
            >
              {/* 昵称：行式布局（标签左 76px + 输入右）+ 字数计数（D5） */}
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors['on-surface-variant'] }]}>
                  {t('profileEdit.nickname')}
                  <Text style={{ color: colors.error }}> *</Text>
                </Text>
                <View style={styles.rowVal}>
                  <View style={styles.inlineInput}>
                    <FormInput
                      control={control}
                      name="name"
                      placeholder={t('profileEdit.nicknamePlaceholder')}
                      style={styles.bareInput}
                      maxLength={15}
                      testID="edit-name"
                      tError={tError}
                    />
                    {/* F2：≥13 字变橙 warning（原数组 last-wins 被覆盖，改单条件三元） */}
                    <Text
                      style={[
                        styles.charCount,
                        { color: nameDraft.length >= 13 ? colors.semantic.warning : colors['on-surface-variant'] },
                      ]}
                    >
                      {`${nameDraft.length}/15`}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />
              {/* 邮箱：选填 */}
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors['on-surface-variant'] }]}>
                  {t('profileEdit.email')}
                </Text>
                <View style={styles.rowVal}>
                  <FormInput
                    control={control}
                    name="email"
                    placeholder={t('profileEdit.emailPlaceholder')}
                    style={styles.bareInput}
                    keyboardType="email-address"
                    testID="edit-email"
                    tError={tError}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* 账号安全（D2）：手机号只读行 + lock 图标 + 客服提示 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
              {t('profileEdit.sectionAccount')}
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors['surface-container-lowest'] },
                shadowPresets.sm,
              ]}
            >
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors['on-surface-variant'] }]}>
                  {t('profileEdit.phone')}
                </Text>
                <View style={styles.rowVal}>
                  <Text style={[styles.rowValue, { color: colors['on-surface'] }]}>
                    {user?.phone ?? '-'}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors['on-surface-variant'] }]}>
                    {t('profileEdit.phoneLocked')}
                  </Text>
                </View>
                <Icon
                  symbol="lock"
                  size={16}
                  color={colors['on-surface-variant']}
                  style={styles.lockIcon}
                />
              </View>
            </View>
            {/* 只读提示行：跳客服（改号后端已就绪但本期不接，D2 拍板） */}
            <Pressable
              onPress={() => router.push('/(main)/service')}
              style={({ pressed }) => [styles.readonlyTip, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={t('profileEdit.contactSupport')}
              testID="edit-contact-support"
            >
              <Icon symbol="info" size={14} color={colors['primary-container']} />
              <Text style={[styles.readonlyTipText, { color: colors['on-surface-variant'] }]}>
                {t('profileEdit.changePhoneTip')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* 底部固定保存栏（D7）：dirty 检测未改动禁用（D5）；F7：禁用态显 noChanges 文案 */}
        <View
          style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors['outline-variant'] }]}
        >
          <Button
            label={isDirty ? t('profileEdit.save') : t('profileEdit.noChanges')}
            variant="primary"
            fullWidth
            loading={updateMutation.isPending}
            disabled={!isDirty || updateMutation.isPending}
            onPress={handleSubmit(submit)}
            testID="edit-save"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.sm },
  avatarZone: {
    alignItems: 'center',
    paddingVertical: spacing.lg + 6,
    borderRadius: borderRadius.xl,
    gap: spacing.xs,
  },
  avatarWrap: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    // 原型 .avatar-wrap 金边 #d4a857（方案陷阱提醒：单处使用不收入 token）
    borderColor: '#d4a857',
    marginBottom: spacing.xs,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // F1：SafeImage 撑满头像区圆形
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.full,
  },
  avatarFallbackText: {
    fontSize: 42,
    fontWeight: '600',
  },
  avatarCam: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: borderRadius.full,
    // 原因: scrim 半透明遮罩 light/dark 通用，代码库 Modal/LoadingOverlay/checkout/feedback 惯例硬编码 rgba
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  avatarMaskText: {
    fontSize: 11,
    fontWeight: '500',
  },
  avatarName: {
    ...typography.h3,
    fontWeight: '700',
  },
  avatarHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  avatarHint: {
    ...typography['body-sm'],
    fontSize: 12,
  },
  section: { gap: spacing.sm },
  sectionTitle: {
    ...typography['label-caps'],
    paddingHorizontal: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.xl + 4,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.md,
    minHeight: 58,
  },
  rowLabel: {
    width: 76,
    ...typography['body-md'],
    fontWeight: '500',
  },
  rowVal: {
    flex: 1,
    gap: 1,
  },
  rowValue: {
    ...typography['body-md'],
    fontSize: 15,
    fontWeight: '500',
  },
  rowSub: {
    fontSize: 11,
  },
  inlineInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bareInput: {
    flex: 1,
  },
  charCount: {
    fontSize: 11,
  },
  lockIcon: {
    opacity: 0.55,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
  },
  readonlyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  readonlyTipText: {
    fontSize: 11,
    lineHeight: 17,
  },
  bottomBar: {
    padding: spacing.md - 4,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    // F6：borderTopColor 移 inline 用 colors['outline-variant']（原硬编码 rgba 深色模式不可见，违反规则 6）
  },
});
