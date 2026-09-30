import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import type { AppLanguage } from '../services/settings';
import { ensureSettingsHydrated, getCurrentLanguage } from '../services/settings';

/**
 * C14（R-P2-14）：language Context。
 *
 * Why：原 useTranslation 内部调 useRiderSettings()——35 个文案组件每个都订阅
 *   settings query，任何 settings invalidate（dutyStatus 心跳/切换班等）触发全量
 *   重渲染。抽 Context 后 useTranslation 只订阅 language 单值，settings query
 *   与文案渲染解耦。
 *
 * 数据流：SettingsProvider（唯一写点 = useUpdateRiderSettings 成功路径）在
 *   language 变化时同步 LanguageContext，消费方经 useTranslation 读取。
 *   初始值走 getCurrentLanguage()（settings 模块态运行时事实源，水合前回退默认链）。
 */

type LanguageContextValue = {
  language: AppLanguage;
  /** 语言切换唯一写点（设置页调用）；同步 Context + settings 模块态 */
  setLanguage: (language: AppLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: getCurrentLanguage(),
  setLanguage: () => {
    // Provider 缺省兜底（理论不可达——App 根部必包）；no-op 防炸
  },
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => getCurrentLanguage());

  // P2-3 修复：冷启动水合竞态——Provider 挂载时持久化可能尚未水合（ensureSettingsHydrated
  // 只被 settings API 调用触发），持久化 language ≠ 默认语言的用户首屏回退默认文案，
  // 且 Context 初始值只求值一次不会自愈。挂载后主动水合并回填 state。
  useEffect(() => {
    let cancelled = false;
    ensureSettingsHydrated().then(() => {
      if (!cancelled) setLanguageState(getCurrentLanguage());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = (next: AppLanguage): void => {
    setLanguageState(next);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext(): LanguageContextValue {
  return useContext(LanguageContext);
}
