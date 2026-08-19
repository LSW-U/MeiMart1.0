import { Fragment } from 'react';
import { Text, View } from 'react-native';

import { AppIcon } from '../ui/AppIcon';
import { colors } from '../../theme/colors';

type DeliveryProgressBarProps = {
  /** 当前到达的步骤（1|2|3）。n < step → done 绿✓；n === step → active 红；n > step → todo 灰 */
  step: 1 | 2 | 3;
  labels: [string, string, string];
  /**
   * T5 审查 P2-1：从 sign/navigate 两份拷贝抽出的共享三段进度条。
   * 纯 UI——step/labels 由调用方注入，业务语义（sign 比 navigate 前进一位、
   * sign 成功态③变绿）在调用方推导，组件不读 task/status。
   */
  success?: boolean;
};

export function DeliveryProgressBar({ step, labels, success = false }: DeliveryProgressBarProps) {
  const stepReached = success ? 3 : step;
  const dotState = (n: 1 | 2 | 3): 'done' | 'active' | 'todo' =>
    n < stepReached ? 'done' : n === stepReached ? 'active' : 'todo';

  return (
    <View className="flex-row items-start px-1 pb-1" testID="delivery-progress-bar">
      {[1, 2, 3].map((n) => {
        const idx = n as 1 | 2 | 3;
        const state = dotState(idx);
        return (
          <Fragment key={n}>
            {n > 1 ? (
              // 连接线（原型 .progress-line）：done 绿 / todo 灰；对齐 dot 垂直中心（dot 28px/2 - 线 1.5px）
              <View
                className="mx-[-2px] mt-[13px] h-[3px] flex-1 rounded-sm"
                style={{ backgroundColor: state === 'todo' ? colors.border : colors.success }}
              />
            ) : null}
            <View className="items-center gap-1">
              <View
                className={'h-7 w-7 items-center justify-center rounded-full ' + (state === 'todo' ? 'bg-surface-container' : '')}
                style={
                  state === 'done'
                    ? { backgroundColor: colors.success }
                    : state === 'active'
                      ? { backgroundColor: colors.primary }
                      : undefined
                }
              >
                {state === 'done' ? <AppIcon color={colors.surface} name="check" size={14} /> : null}
              </View>
              <Text
                className={
                  'text-[10px] font-semibold ' +
                  (success && n === 3 ? 'font-bold' : state === 'active' ? 'font-bold text-primary' : 'text-on-surface-variant')
                }
                style={success && n === 3 ? { color: colors.success } : undefined}
              >
                {labels[n - 1]}
              </Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}
