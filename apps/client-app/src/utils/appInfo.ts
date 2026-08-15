// App 版本信息（P17 决策 6 —— 2026-08-15 拍板：静态 import app.json）
// Why: expo-application / expo-constants 均未装，静态 import 零依赖、Web/native 通用；
//      app.json 是 EAS 构建流程的单一版本源（改版本 → build），语义一致。
//      风险（已接受）：编译期锁定，改版本号需重新构建。
import appJson from '../../app.json';

export const APP_VERSION: string = appJson.expo.version;
