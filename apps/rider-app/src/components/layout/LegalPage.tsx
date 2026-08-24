import { ScrollView, Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { AppIcon, type AppIconName } from '../ui/AppIcon';
import { useTranslation, type TranslationKey } from '../../i18n/useTranslation';
import { SimplePageHeader } from './SimplePageHeader';

/**
 * LegalPage —— 服务条款/隐私政策共享法律文档页骨架（P5 §3.2/§3.5）。
 *
 * 消除 terms.tsx / privacy.tsx 27 行结构 100% 重复：仅 titleKey/bodyKey/versionKey/icon 差异。
 * 正文仍走 i18n 占位文案（Q3=A 法务未定稿前不碰正文），底部版本号条（Q5=A 仅版本+生效日期）。
 * 后端就位后正文改 API 下发、版本号从 API 读（见方案 §7 P1 后端待补）。
 */
type LegalPageProps = {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  versionKey: TranslationKey;
  icon: Extract<AppIconName, 'document' | 'shield'>;
  backLabel: string;
};

export function LegalPage({ titleKey, bodyKey, versionKey, icon, backLabel }: LegalPageProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-background">
      <SimplePageHeader backLabel={backLabel} title={t(titleKey)} />
      <ScrollView contentContainerClassName="gap-4 px-5 py-6 pb-12">
        <View className="rounded-3xl bg-primary p-6 shadow-sm">
          <AppIcon color={colors.surface} name={icon} size={34} />
          <Text className="mt-4 text-2xl font-bold text-white">{t(titleKey)}</Text>
        </View>
        <View className="rounded-2xl border border-surface-container bg-surface p-5 shadow-sm">
          <Text className="text-sm leading-6 text-on-surface-variant">{t(bodyKey)}</Text>
          <Text className="mt-4 text-xs text-outline">{t(versionKey)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
