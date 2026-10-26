import { Pressable, Text, View } from 'react-native';

type TabItem<K extends string> = {
  key: K;
  /** 缺省容忍（TaskDetailHeader 详情页视图不渲染 Tabs，由调用方 guard） */
  label?: string;
};

/** 激活色档：登录双模用品牌 primary / 任务页三 tab 用 primary-container（历史视觉保留） */
const ACTIVE_CLASS = {
  primary: { text: 'text-primary', indicator: 'bg-primary' },
  'primary-container': { text: 'text-primary-container', indicator: 'bg-primary-container' },
} as const;

type TabsProps<K extends string> = {
  tabs: readonly TabItem<K>[];
  active: K;
  onChange: (key: K) => void;
  /** 字号档：sm=text-xs/加粗大写字距（登录双模切换）/ lg=text-base/半粗（任务页三 tab，默认） */
  size?: 'sm' | 'lg';
  /** 激活色档（默认 primary-container，任务页口径） */
  tone?: keyof typeof ACTIVE_CLASS;
  /** 容器追加类（任务页 gap-6 border-b；登录 border-b 容器位） */
  className?: string;
  /** 条目追加类（登录 flex-1 py-4；任务页 pb-1） */
  itemClassName?: string;
};

/**
 * Tabs —— R-P2-17/24（走查 20261024）：收编 login（text-xs + h-[3px]）与
 * TaskDetailHeader（text-base + h-0.5）两套自绘 tab。
 * 指示线粗细统一 h-0.5 单源（拍板 20261026：登录 3px→2px 对齐，视觉微变）；字号 sm/lg
 * 与激活色 tone 带档保留两场景差异；语义升级 tablist / tab（原两处均为 button）。
 */
export function Tabs<K extends string>({
  tabs,
  active,
  onChange,
  size = 'lg',
  tone = 'primary-container',
  className = '',
  itemClassName = '',
}: TabsProps<K>) {
  const activeClass = ACTIVE_CLASS[tone];
  return (
    <View accessibilityRole="tablist" className={`flex-row ${className}`}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <Pressable
            accessibilityLabel={tab.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            className={itemClassName}
            key={tab.key}
            onPress={() => onChange(tab.key)}
          >
            <Text
              className={`text-center ${size === 'sm' ? 'text-xs font-bold tracking-wider' : 'text-base font-semibold'} ${isActive ? activeClass.text : 'text-on-surface-variant'}`}
            >
              {tab.label}
            </Text>
            {isActive ? (
              <View
                className={`${size === 'sm' ? 'mt-3' : 'mt-1'} h-0.5 rounded-full ${activeClass.indicator}`}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
