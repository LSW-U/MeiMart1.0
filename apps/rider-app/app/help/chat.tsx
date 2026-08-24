import { View, Text } from 'react-native';

import { colors } from '../../src/theme/colors';
import { AppIcon } from '../../src/components/ui';
import { SimplePageHeader } from '../../src/components/layout/SimplePageHeader';
import { useTranslation } from '../../src/i18n/useTranslation';

/**
 * 在线客服占位页（P5 §3.1 改动 2，Q1=A 占位路由）。
 *
 * 后端 IM 系统（站内聊天 / WebSocket 或第三方 SDK）就位前，先占位提示引导回客服热线。
 * IM 就位后此页替换为真实聊天 UI（见方案 §7 P1 后端待补）。
 */
export default function HelpChatPage() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-background">
      <SimplePageHeader backLabel={t('common.back')} title={t('help.support.onlineService')} />
      <View className="flex-1 items-center justify-center px-8">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-surface-container-low">
          <AppIcon color={colors.outline} name="chat" size={32} />
        </View>
        <Text className="px-6 text-center text-sm leading-6 text-on-surface-variant">{t('help.support.comingSoon')}</Text>
      </View>
    </View>
  );
}
