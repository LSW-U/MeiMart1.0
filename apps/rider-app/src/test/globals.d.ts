/**
 * 测试专用全局类型（src/test/react-native.mock.js 消费）
 *
 * - __RN_PLATFORM_OS__：RN mock 壳 Platform.OS 可切换开关（T3）。默认 undefined = 'web'；
 *   测 Native 分支（如 EvidenceUpload 权限/相机异常治理）时置 'ios'。
 */
declare global {
  var __RN_PLATFORM_OS__: 'web' | 'ios' | 'android' | undefined;
}

export {};
