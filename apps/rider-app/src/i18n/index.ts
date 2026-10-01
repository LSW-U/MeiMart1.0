// 跨端基建统一 批1（D9 同口径）：i18n-core 的 locale 运行时注入——rider 端事实源是
// settings.getCurrentLanguage（模块态，native 无 localStorage 同步读的教训见 P3-2）。
// upload.ts 等服务层改调 i18n-core currentLocale()，不再各自定义。
// 注意：AppLanguage 含 'id'，i18n-core Locale 是 4 语——'id' 属超出 4 语键集的直通值，
// currentLocale() 会原样透传（服务端 Accept-Language 语义不变），多语取值走回退链兜底。
import { setLocaleRuntime, type Locale } from '@meimart/i18n-core';
import { getCurrentLanguage } from '../services/settings';

export { useTranslation } from './useTranslation';
export { LanguageProvider, useLanguageContext } from './LanguageContext';

setLocaleRuntime(() => getCurrentLanguage() as Locale);
