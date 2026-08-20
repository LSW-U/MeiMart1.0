// AboutPage — 品牌展示页（PrimaryHeader + 品牌区 + 信任数据条 + 联系/社交/法律/评分卡，P25 优化）
// 版本号走 @/utils/appInfo（P17 决策 6 单一数据源）；法律 terms/privacy 跳 legal/[type]
import { StyleSheet, View, Text, Pressable, ScrollView, Share, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeBack } from '@/hooks/useSafeBack';
import { useTranslation } from 'react-i18next';
import { toast } from '@/store/toastStore';
import { useTheme, spacing, typography, borderRadius, shadowPresets } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';
import { PrimaryHeader } from '@/components/layout/PrimaryHeader';
import { StatusBarConfig } from '@/components/layout/StatusBar';
import { LogoBadge } from '@/components/cultural/LogoBadge';
import { DiamondPattern } from '@/components/cultural/DiamondPattern';
import { Icon } from '@/components/ui/Icon';
import { openExternalLink } from '@/utils/linking';
import { APP_VERSION } from '@/utils/appInfo';

// 应用商店评分链接（集中管理，审查 F2）—— ⚠️ CP8/EAS 上架前必须替换真实 appId：
// TODO(CP8): iOS 换 App Store Connect 的数字 id；Android 确认 EAS package 名后核对
const STORE_LINKS = {
  ios: 'https://apps.apple.com/app/meimart/idPLACEHOLDER',
  android: 'https://play.google.com/store/apps/details?id=com.meimart.client',
} as const;

export default function AboutPage() {
  const handleBack = useSafeBack();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  // F4：订单数按 locale 格式化——zh「5万+」对齐原型 L217；tet 无 K 千缩写习惯用「50 mil+」（审查 F5）；en「50K+」
  const ordersStat = i18n.language === 'zh' ? '5万+' : i18n.language === 'tet' ? '50 mil+' : '50K+';

  return (
    <SafeAreaWrapper
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBarConfig />
      <PrimaryHeader
        title={t('about.title')}
        showBack
        onBackPress={handleBack}
        testID="about-back"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* DiamondPattern 装饰背景（参考 SplashPage 第 150 行） */}
        <View style={styles.diamondBg} pointerEvents="none">
          <DiamondPattern width={200} height={200} opacity={0.04} />
        </View>

        {/* 品牌区（参考 SplashPage 第 151-164 行） */}
        <View style={styles.brand}>
          <View style={[styles.logoWrap, shadowPresets.md]}>
            <LogoBadge size={96} testID="about-logo" />
          </View>
          <Text
            style={[styles.appName, { color: colors['on-surface'] }]}
            accessibilityRole="header"
          >
            MeiMart
          </Text>
          <Text style={[styles.tagline, { color: colors.primary }]}>
            {t('about.tagline', { defaultValue: 'Tolu Hamutuk Sosa Fácil' })}
          </Text>
          <Text style={[styles.subTagline, { color: colors['on-surface-variant'] }]}>
            {t('about.subtitle', { defaultValue: 'Your Local Marketplace in Timor-Leste' })}
          </Text>
        </View>

        {/* dev 反馈：TaisDivider 装饰分割线已删 */}

        {/* 信任数据条（D5）— 白底浮起卡片，3 列竖线分隔；数值为前端兜底静态值（D13 后端可配置预留） */}
        <View
          style={[
            styles.statStrip,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.md,
          ]}
        >
          {(
            [
              { num: '13', label: t('about.statRegions') },
              { num: '200+', label: t('about.statMerchants') },
              { num: ordersStat, label: t('about.statOrders') },
            ] as const
          ).map((s, i) => (
            <View
              key={s.label}
              style={[styles.statItem, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors['outline-variant'] }]}
            >
              <Text style={[styles.statNum, { color: colors.primary }]}>{s.num}</Text>
              <Text style={[styles.statLbl, { color: colors['on-surface-variant'] }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* 使命卡（D4/D12）— handshake 图标 + 左对齐文案，替代 TaisPattern/Skyline 堆叠 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <View style={styles.missionRow}>
            <View style={[styles.missionIco, { backgroundColor: colors['primary-container'] }]}>
              <Icon symbol="handshake" size={22} color={colors['on-primary-container']} />
            </View>
            {/* F3：`|...|` 分隔符段渲染 primary 加粗强调（对齐原型 <b> 商家与消费者/送货到家） */}
            <Text style={[styles.missionTxt, { color: colors['on-surface'] }]}>
              {t('about.mission')
                .split('|')
                .map((seg, i) =>
                  i % 2 === 1 ? (
                    <Text key={i} style={{ color: colors.primary, fontWeight: '700' }}>
                      {seg}
                    </Text>
                  ) : (
                    <Text key={i}>{seg}</Text>
                  ),
                )}
            </Text>
          </View>
        </View>

        {/* 信息卡片 */}
        <View
          style={[
            styles.infoBlock,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors['on-surface'] }]}>
            {t('about.contactTitle', { defaultValue: 'Contact' })}
          </Text>

          <InfoRow
            icon="account_balance"
            label={t('about.company')}
            value="MeiMart Lda."
            color={colors['on-surface']}
            subColor={colors['on-surface-variant']}
          />

          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />

          <InfoRow
            icon="location_on"
            label={t('about.address')}
            value="Rua de Bebora, Colmera, Dili, Timor-Leste"
            color={colors['on-surface']}
            subColor={colors['on-surface-variant']}
          />

          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />

          <InfoRow
            icon="mail"
            label={t('about.email')}
            value="support@meimart.tl"
            color={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="about-email"
            onPress={() => openExternalLink('mailto:support@meimart.tl', t('errors.openLinkFailed'))}
          />

          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />

          <InfoRow
            icon="phone"
            label={t('about.phone', { defaultValue: 'Phone' })}
            value="+670 7700 0000"
            color={colors['on-surface']}
            subColor={colors['on-surface-variant']}
            testID="about-phone"
            onPress={() => openExternalLink('tel:+67077000000', t('errors.openLinkFailed'))}
          />
        </View>

        {/* 关注我们（D7）— 东帝汶主流社交三入口 */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
            {t('about.followTitle')}
          </Text>
          <View style={styles.socialRow}>
            {(
              [
                { icon: 'facebook', label: 'Facebook', url: 'https://facebook.com/meimart' },
                { icon: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/67077000000' },
                { icon: 'instagram', label: 'Instagram', url: 'https://instagram.com/meimart' },
              ] as const
            ).map((s) => (
              <Pressable
                key={s.icon}
                onPress={() => openExternalLink(s.url, t('errors.openLinkFailed'))}
                style={({ pressed }) => [
                  styles.socialBtn,
                  { backgroundColor: colors['surface-container-high'] },
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={s.label}
                testID={`about-social-${s.icon}`}
              >
                <Icon symbol={s.icon} size={22} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* 法律与条款（D6）— terms/privacy 跳 legal/[type]；license 占位不跳（LegalType 仅两值，见 P25 拍板 A） */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
            {t('about.legalTitle')}
          </Text>
          <LegalRow
            icon="description"
            label={t('about.terms')}
            testID="about-legal-terms"
            onPress={() => router.push('/legal/terms')}
          />
          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />
          <LegalRow
            icon="privacy_tip"
            label={t('about.privacy')}
            testID="about-legal-privacy"
            onPress={() => router.push('/legal/privacy')}
          />
          {/* dev 反馈：营业资质与上两行一致可跳转（legal/license 占位页） */}
          <View style={[styles.rowDivider, { backgroundColor: colors['outline-variant'] }]} />
          <LegalRow
            icon="verified"
            label={t('about.license')}
            testID="about-legal-license"
            onPress={() => router.push('/legal/license')}
          />
        </View>

        {/* 支持我们（D8）— 评分降级跳应用商店；分享走 RN Share */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors['surface-container-lowest'] },
            shadowPresets.sm,
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors['on-surface-variant'] }]}>
            {t('about.supportTitle')}
          </Text>
          {/* F1：评分按平台分流——iOS 跳 App Store / Android 跳 Play Store（单平台链接在另一端只会开网页报不兼容） */}
          <LegalRow
            icon="star_rate"
            label={t('about.rate')}
            testID="about-rate"
            onPress={() => {
              // F1：评分按平台分流——iOS 跳 App Store / Android 跳 Play Store（链接见 STORE_LINKS，上架前替换 TODO）
              const storeUrl = Platform.OS === 'ios' ? STORE_LINKS.ios : STORE_LINKS.android;
              openExternalLink(storeUrl, t('errors.openLinkFailed'));
            }}
          />
          <LegalRow
            icon="share"
            label={t('about.share')}
            testID="about-share"
            onPress={() => {
              const message = `${t('about.tagline')} — MeiMart`;
              if (Platform.OS === 'web') {
                // F2：Web 端 Share API 兼容性差，clipboard 兜底 + toast 反馈（对齐 order/[id] 先例）
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(message).catch(() => {});
                  toast.success(t('order.shareCopied', { defaultValue: 'Order link copied' }));
                }
              } else {
                Share.share({ message }).catch(() => {
                  // 用户取消分享，静默
                });
              }
            }}
          />
        </View>

        {/* 版本号 + Copyright（dev 反馈：对齐原型 .ab-footer——「版本 v1.0.0」+「© 2026 MeiMart Lda.」两行） */}
        <View style={styles.footer}>
          <Text style={[styles.version, { color: colors['on-surface-variant'] }]}>
            {t('about.versionLabel')} v{APP_VERSION}
          </Text>
          <Text style={[styles.copyright, { color: colors['on-surface-variant'] }]}>
            © 2026 MeiMart Lda.{'\n'}
            {t('about.rights')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}

function InfoRow({
  icon,
  label,
  value,
  color,
  subColor,
  testID,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
  subColor: string;
  testID?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const body = (
    <>
      <View style={[styles.infoIcon, { backgroundColor: colors['surface-container-high'] }]}>
        <Icon symbol={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: subColor }]}>{label}</Text>
        <Text style={[styles.infoValue, { color }]}>{value}</Text>
      </View>
      {onPress && <Icon symbol="chevron_right" size={18} color={subColor} />}
    </>
  );
  // dev 反馈修复：View 不支持函数 style（原 Wrapper 技巧在无 onPress 行样式静默失效 → 竖排），
  // 改双分支 return（P25 审查发现 6 的类型债一并清偿）
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [styles.infoRow, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={styles.infoRow}>
      {body}
    </View>
  );
}

/** 法律/评分类单行入口（D6/D8）：圆形图标 + 单行文案 + chevron；license 类占位行用 caption 替代跳转 */
function LegalRow({
  icon,
  label,
  testID,
  onPress,
  caption,
}: {
  icon: string;
  label: string;
  testID?: string;
  onPress?: () => void;
  /** 占位说明（如营业资质「即将上线」），有 caption 时不跳转 */
  caption?: string;
}) {
  const { colors } = useTheme();
  const body = (
    <>
      <View style={[styles.legalIco, { backgroundColor: colors['surface-container-high'] }]}>
        <Icon symbol={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.legalText}>
        <Text style={[styles.legalLabel, { color: colors['on-surface'] }]}>{label}</Text>
        {caption != null && (
          <Text
            style={[styles.legalCaption, { color: colors['on-surface-variant'] }]}
            numberOfLines={1}
          >
            {caption}
          </Text>
        )}
      </View>
      {onPress && (
        <Icon symbol="chevron_right" size={18} color={colors['on-surface-variant']} />
      )}
    </>
  );
  // dev 反馈修复：同 InfoRow——View 分支不支持函数 style，改双分支 return
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [styles.legalRow, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={styles.legalRow}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
    position: 'relative',
  },
  diamondBg: {
    position: 'absolute',
    top: -spacing.md,
    right: -spacing.md,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    marginTop: spacing.md,
  },
  logoWrap: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  appName: {
    ...typography.h1,
    fontWeight: '700',
  },
  tagline: {
    ...typography['label-caps'],
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: spacing.xs,
  },
  subTagline: {
    ...typography['body-sm'],
    opacity: 0.8,
    marginTop: 2,
  },
  statStrip: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    ...typography.h3,
    fontWeight: '800',
  },
  statLbl: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  card: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
  },
  missionIco: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionTxt: {
    flex: 1,
    ...typography['body-md'],
    lineHeight: 21,
  },
  infoBlock: {
    borderRadius: borderRadius.xl,
    // dev 反馈：外层去 padding，留白由 sectionTitle/infoRow 自带（对齐原型 .card 的行级 padding 16）
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...typography['label-caps'],
    // 对齐原型 .card-title（padding 14 16 6）——dev 反馈：标题不再贴卡片左上角
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.sm - 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // 对齐原型 .info-row：padding 12 16 + 行间细线由外层 rowDivider 提供
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    minHeight: 56,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  infoLabel: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  infoValue: {
    ...typography['body-md'],
    fontWeight: '500',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    // 对齐原型 .social-row：padding 6 16 16
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.md,
  },
  socialBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // 对齐原型 .legal-row：padding 14 16
    paddingVertical: spacing.sm + 6,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  legalIco: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legalText: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  legalLabel: {
    ...typography['body-md'],
    fontWeight: '500',
  },
  legalCaption: {
    ...typography['body-sm'],
    opacity: 0.7,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  version: {
    ...typography['label-caps'],
    fontSize: 10,
  },
  copyright: {
    ...typography['label-caps'],
    fontSize: 10,
    textAlign: 'center',
  },
});
