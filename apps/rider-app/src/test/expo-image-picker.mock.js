/**
 * expo-image-picker 最小 mock（web project / jsdom 用）
 *
 * Why: EvidenceUpload Native 分支 require('expo-image-picker') 拉相机权限/启动相机。
 * jsdom 无原生模块，页面测试（pickup/sign）需可控的权限与拍照结果。
 *
 * 用法：测试里 import 本模块后改 requestCameraPermissionsAsyncResolve /
 * launchCameraAsyncResolve 控制 takePhoto 分支（权限拒/拍照异常/成功回调 uri）。
 */
let requestCameraPermissionsResolve = { status: 'granted' };
let launchCameraAsyncImpl = async () => ({ canceled: false, assets: [{ uri: 'file://photo.jpg' }] });

module.exports = {
  requestCameraPermissionsAsync: async () => requestCameraPermissionsResolve,
  launchCameraAsync: async (...args) => launchCameraAsyncImpl(...args),
  __setRequestCameraPermissions: (v) => {
    requestCameraPermissionsResolve = v;
  },
  __setLaunchCameraAsync: (fn) => {
    launchCameraAsyncImpl = fn;
  },
};
