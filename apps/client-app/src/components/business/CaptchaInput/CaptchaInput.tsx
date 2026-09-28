// CaptchaInput — 图形验证码（批A2-2）
// 拉取 GET /common/auth/captcha（SVG + captchaId，60s 一次性票据）+ 4 位文本输入 + 点图刷新
// 选型：SvgXml 直接渲染后端返回的 SVG 字符串（仓内 react-native-svg 已有 7+ 组件先例，
// 不引入新依赖；相比 Image data-uri 免 base64 编码且矢量清晰）
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, Pressable, View, ActivityIndicator } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useTheme, spacing, typography } from '@/theme';
import { useFetchCaptcha } from '@/services/queries/useAuth';
import type { CaptchaPayload } from '@/services/auth';

interface CaptchaInputProps {
  /** 输入变化回调（父层随发码请求一并提交 captchaId/captchaText） */
  onChange: (payload: CaptchaPayload | null) => void;
  testID?: string;
}

export function CaptchaInput({ onChange, testID = 'captcha-input' }: CaptchaInputProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { mutate: mutateFetch, isPending } = useFetchCaptcha();
  const [svg, setSvg] = useState<string | null>(null);
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [text, setText] = useState('');
  // P3-1: expired 不再是死状态——按签发响应 expireIn 起定时器置 true（票据 60s 一次性），
  // 到期禁交付 + 提示重拉，避免用户提交吃 400 才知道过期
  const [expired, setExpired] = useState(false);
  const [expireIn, setExpireIn] = useState<number | null>(null);
  // Why: onChange 多为父层 inline 回调（每渲染新引用），refresh/定时器回调经 ref 取最新引用，
  // 避免把 onChange 挂进 effect 依赖（react-hooks/refs 禁 render 期写 ref，改在 effect 内写）
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const refresh = useCallback(
    (
      _vars: undefined,
      opts?: { onSuccess?: (r: { captchaId: string; svg: string }) => void; onError?: () => void },
    ) => {
      // Why: 票据消费即焚——刷新瞬间作废父层已持有的旧 {captchaId, captchaText}，
      // 否则用户输满→点刷新→不重输直接发码，父层旧票据放行吃 400（P2-1）
      onChangeRef.current(null);
      setExpired(false);
      setText('');
      mutateFetch(undefined, {
        onSuccess: (res) => {
          setSvg(res.svg);
          setCaptchaId(res.captchaId);
          setExpireIn(res.expireIn);
          opts?.onSuccess?.(res);
        },
        onError: () => {
          setSvg(null);
          setCaptchaId(null);
          onChangeRef.current(null);
          opts?.onError?.();
        },
      });
    },
    // Why: onChangeRef.current 读取发生在事件/异步回调（非 render 期），refresh 无需依赖 onChange
    [mutateFetch, onChangeRef],
  );
  useEffect(() => {
    if (expireIn == null) return;
    const timer = setTimeout(() => {
      setExpired(true);
      onChangeRef.current(null);
    }, expireIn * 1000);
    return () => clearTimeout(timer);
  }, [expireIn]);

  // 挂载即拉一张；父层无需手动触发首次加载
  // Why: setState 实际全部在 mutation 异步回调内执行（非 effect body 同步 setState），
  // 初始拉取属「订阅外部系统」式副作用；refresh 稳定（依赖仅 mutateFetch），仅跑一次。
  // 静态分析穿透 useCallback 把 refresh 闭包内的 setExpired/setText 判为同步 setState，误报
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 原因：refresh 内 setState 均在异步回调，非 effect body 同步调用
    refresh(undefined);
  }, [refresh]);

  const handleChangeText = (value: string) => {
    setText(value);
    // 完整 4 位且票据在期（captchaId 已签发）才向上交付；任一缺失置 null（父层禁发）。
    // 已焚票据（刷新/到期后）由 refresh/到期回调的 onChange(null) 主动清父层（P2-1）
    if (captchaId && value.length === 4 && !expired) {
      onChange({ captchaId, captchaText: value });
    } else {
      onChange(null);
    }
  };

  const handleRefresh = () => {
    // 票据消费即焚：重新拉取即作废旧票据
    refresh(undefined);
  };

  return (
    <View testID={testID}>
      <Text style={[styles.label, { color: colors['on-surface-variant'] }]}>
        {t('auth.captchaLabel')}
      </Text>
      <View style={styles.row}>
        <Pressable
          onPress={handleRefresh}
          accessibilityRole="imagebutton"
          accessibilityLabel={t('auth.captchaRefreshA11y')}
          // 方案A（调度拍板 20260928）: prop 挂外层容器——SvgXml（react-native-svg）不支持该
          // prop 会 React 报 warning；语义=整块图形码（含点按行为）对读屏隐藏
          accessibilityElementsHidden
          testID={`${testID}-image`}
          style={({ pressed }) => [
            styles.captchaBox,
            { backgroundColor: colors['surface-container'], borderColor: colors.outline },
            pressed && { opacity: 0.7 },
          ]}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : svg ? (
            <SvgXml xml={svg} width={120} height={44} />
          ) : (
            <Text style={[styles.failText, { color: colors.error }]}>{t('errors.generic')}</Text>
          )}
        </Pressable>
        <TextInput
          value={text}
          onChangeText={handleChangeText}
          maxLength={4}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          placeholder={t('auth.captchaPlaceholder')}
          placeholderTextColor={colors['on-surface-variant']}
          style={[styles.textInput, { color: colors['on-surface'], borderColor: colors.outline }]}
          accessibilityLabel={t('auth.captchaLabel')}
          testID={`${testID}-field`}
        />
      </View>
      <Pressable
        onPress={handleRefresh}
        accessibilityRole="button"
        accessibilityLabel={t('auth.captchaRefreshA11y')}
        testID={`${testID}-refresh`}
        hitSlop={8}
      >
        {/* P3-1: 票据到期后刷新按钮升级为醒目提示（primary 文案换警示色 + 加粗） */}
        <Text
          style={[
            styles.refreshText,
            expired ? { color: colors.error, fontWeight: '700' } : { color: colors.primary },
          ]}
        >
          {expired ? t('auth.captchaExpired') : t('auth.captchaRefresh')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography['body-sm'],
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  captchaBox: {
    width: 120,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failText: {
    ...typography['body-sm'],
  },
  textInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    ...typography['body-md'],
  },
  refreshText: {
    ...typography['body-sm'],
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
