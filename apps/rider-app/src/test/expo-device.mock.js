/**
 * expo-device mock（web project / jsdom 用）
 *
 * Why: 批C C3 push-token.ts 用 Device.isDevice 判断模拟器跳过注册。
 * expo-device build 是 ESM + 原生宿主（jsdom 无 ExpoDevice native module）。
 * 测试用 __setIsDevice 控制真机/模拟器分支。
 */
let isDeviceValue = true;

export function __setIsDevice(value) {
  isDeviceValue = value;
}

export const Device = {
  get isDevice() {
    return isDeviceValue;
  },
};

export default Device;
