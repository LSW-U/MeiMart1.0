const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = path.resolve(__dirname);
const config = getDefaultConfig(projectRoot);

// SVG transformer
const { transformer } = config;
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// ── dev 标志捕获（数据层工程治理 批3 D13）─────────────────────────────
// Why 不用 process.env.NODE_ENV：expo export 下实测（@expo/cli 56.1.26），
// metro.config.js 加载期 NODE_ENV 恒为 'development'（exportAppAsync 的赋值时机
// 晚于 config require，且 env 系统会回写），不可靠。改从 transformer
// .getTransformOptions 捕获 metro 传入的 options.dev（release export 传 false /
// dev 服务传 true）。resolver 与 transformer 的执行无先后保证，所以默认按 dev
// （fail-safe：宁可不剔除 preview，也不误剔生产模块）；getTransformOptions 在
// bundle 入口解析时先于 app/ 模块全量 resolve 执行，release export 下 __MEI_DEV__
// 在 preview 路由 resolve 前已被置 false（时序已实测验证）。
globalThis.__MEI_DEV__ = true;
const __origGetTransformOptions = config.transformer.getTransformOptions;
config.transformer.getTransformOptions = async (entryFile, transformOptions, ...rest) => {
  const opts = await __origGetTransformOptions(entryFile, transformOptions, ...rest);
  // opts.dev 可能缺省（默认配置不透传），fallback 用 metro 传入的 transformOptions.dev
  globalThis.__MEI_DEV__ = (opts?.dev !== undefined ? opts.dev : transformOptions?.dev) !== false;
  return opts;
};

// ── preview 生产剔除（D13：metro resolver 层）──────────────────────────
// app/preview/ 是内部 UI 预览器（theme 调色板 + 页面索引）。P0-8 已加运行时
// __DEV__ 守卫（渲染 null，但模块代码仍进 bundle）。本 resolver 在生产构建
// 把 app/preview/** 的模块（含 expo-router 的 _layout 注册链）解析为空模块 stub，
// preview 代码零进包；dev 构建（expo start / run:ios|android dev 变体）不走该
// 分支，preview 照常可见（R5 条件化）。app/preview/index.tsx 的运行时 __DEV__
// 守卫保留不删（双保险：本 resolver 误配回 dev 时仍有运行时守卫）。
const PREVIEW_DIR = 'app/preview/';
const EMPTY_MODULE = path.resolve(__dirname, './scripts/metro/empty-module.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    globalThis.__MEI_DEV__ === false &&
    context.originModulePath &&
    context.originModulePath.includes(PREVIEW_DIR)
  ) {
    return { filePath: EMPTY_MODULE, type: 'sourceFile' };
  }
  // 其余走 metro 默认解析（context.resolveRequest 是默认实现，非本文件的函数）
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
