/**
 * NetInfo 类型入口（api-core 内部用）
 *
 * Why 独立文件：trackingSocket.ts `import NetInfo from '@react-native-community/netinfo'`
 * 在包 typecheck（node 环境）下没有该依赖类型会炸；peerDependency 只在 app 侧安装。
 * 测试里也要能拿到 addEventListener 的类型——集中这里断言。
 */
import type NetInfo from '@react-native-community/netinfo';

export type NetInfoSubscription = () => void;

export interface NetInfoStateShape {
  isInternetReachable: boolean | null;
}

/** 测试/内部使用的 NetInfo 最小面（真包类型由 app 侧提供） */
export interface NetInfoModuleShape {
  addEventListener(
    listener: (state: NetInfoStateShape) => void,
  ): NetInfoSubscription;
}

// 运行时值由 trackingSocket.ts 直接 import 真包获得；本文件只做类型出口。
export type NetInfoType = typeof NetInfo;
