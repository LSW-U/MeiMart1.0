/**
 * expo-localization 最小 mock（web project / jsdom 用）
 *
 * Why: 批C 设备跟随让 settings.ts 顶层 import { getLocales } from 'expo-localization'，
 * 该包是 ESM 发布且拉原生宿主——jsdom project 的 transformIgnorePatterns 不放行，
 * queries/页面测试链（→ useTranslation → useSettings → settings.ts）会炸
 * "Cannot use import statement outside module"。桩成 CJS 可控 mock
 * （与 expo-image-picker.mock.js 同模式）。
 *
 * 用法：测试里 __setDeviceLanguage(code) 控制 detectDeviceLanguage 的设备语言。
 */
let deviceLanguageCode = 'zh';

module.exports = {
  getLocales: () => [{ languageCode: deviceLanguageCode, languageTag: deviceLanguageCode }],
  getCalendars: () => [{ timeZone: 'Asia/Dili', uses24hourClock: true, firstDay: 1 }],
  __setDeviceLanguage: (code) => {
    deviceLanguageCode = code;
  },
};
