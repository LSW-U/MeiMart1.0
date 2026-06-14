import Constants from 'expo-constants';
import { isDevice } from 'expo-device';
import { Platform } from 'react-native';

interface DeviceRiskAssessment {
  jailbroken: boolean;
  emulator: boolean;
  devMode: boolean;
  secure: boolean;
  reasons: string[];
}

export async function assessDeviceRisk(): Promise<DeviceRiskAssessment> {
  const reasons: string[] = [];

  // 模拟器检测
  const isEmulator = isDevice === false;
  if (isEmulator) reasons.push('运行在模拟器上');

  // 越狱/Root 检测（基础启发式）
  let jailbroken = false;
  if (Platform.OS === 'android') {
    jailbroken = await checkAndroidRoot();
  } else if (Platform.OS === 'ios') {
    jailbroken = await checkIosJailbreak();
  }
  if (jailbroken) reasons.push(Platform.OS === 'ios' ? '设备已越狱' : '设备已 Root');

  // 开发模式检测
  const devMode = __DEV__;
  if (devMode) reasons.push('应用运行在开发模式');

  return {
    jailbroken,
    emulator: isEmulator,
    devMode,
    secure: !jailbroken && !isEmulator && !devMode,
    reasons,
  };
}

async function checkAndroidRoot(): Promise<boolean> {
  try {
    // 越狱检测常见路径（best-effort，需原生模块增强）
    const suspects = [
      '/system/app/Superuser.apk',
      '/sbin/su',
      '/system/bin/su',
      '/system/xbin/su',
      '/data/local/xbin/su',
      '/data/local/bin/su',
    ];
    // 注：RN 无文件系统访问，此处仅作占位
    // 真实实现需 native module 或 expo-devicheck
    return suspects.length > 0 && Constants.executionContext === 'store';
  } catch {
    return false;
  }
}

async function checkIosJailbreak(): Promise<boolean> {
  // Cydia/Sileo 检测需原生模块
  // 此处依赖 Sentry 或第三方库的检测能力
  return false;
}

export function getRiskWarningMessage(reasons: string[]): string {
  if (reasons.length === 0) return '';
  return `检测到以下风险：\n${reasons.map((r) => `• ${r}`).join('\n')}\n\n继续使用可能导致账户安全风险。`;
}
