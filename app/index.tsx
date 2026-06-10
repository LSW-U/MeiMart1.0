import { Image, Text, View } from 'react-native';

import { useTranslation } from '../src/i18n/useTranslation';

const logoUri = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-6dcCprNSyQ_GxlXIFWLHAuZIw_CRsHY4u6frWEeT0N86F-BQTIlEZuiQfqh5cqw9M0wPcreFni8aLQRo8m4nVI9e7SnPn3JWK7kB2eI30uNHd-jlAK_dj55RdzTh1DmN0qA1ectF2PY3P1BCNthEdB5xDPll_F-61CiMhdiGEkklWqrSrJJnVlsSLA-SvqpGRkPCfzHLMlVLlF8Gv4Vf6yg4VPULIxZQTLefhmbsS3crH-V4JG_wwVMDf8n1KilQdrJIHpUgww';

export default function SplashPage() {
  const { t } = useTranslation();

  return (
    <View className="min-h-full flex-1 items-center justify-center overflow-hidden bg-[#fff8f7]">
      <View className="h-full w-full max-w-md flex-1 items-center justify-between px-6 py-20">
        <View className="flex-1 items-center justify-center gap-8">
          <View className="h-48 w-48 items-center justify-center">
            <Image className="h-full w-full" resizeMode="contain" source={{ uri: logoUri }} />
          </View>
          <View className="items-center">
            <Text className="text-3xl font-bold tracking-tight text-[#8B0000]">{t('app.name')}</Text>
            <Text className="mt-2 text-sm font-medium uppercase tracking-wide text-stone-500">{t('app.tagline')}</Text>
          </View>
        </View>
        <View className="items-center gap-6">
          <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-[#8B0000]/20">
            <View className="h-5 w-5 rounded-full bg-[#8B0000]" />
          </View>
          <Text className="text-xs font-medium uppercase tracking-widest text-stone-400">{t('splash.status')}</Text>
        </View>
      </View>
      <View className="absolute bottom-0 left-0 h-1 w-full bg-[#8B0000] opacity-10" />
    </View>
  );
}
