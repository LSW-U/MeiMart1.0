/**
 * WS 自愈参数单点（跨端基建统一 批3 A5，D7 Q5）
 *
 * 两端 WS 连接的重连参数唯一事实来源——client tracking.ts（原 websocket-only+5次+固定3s）
 * 与 rider ws.ts（已退避）统一走本常量。改这里一处，两端同时生效。
 *
 * ⚠️ 待后端 D7 长宕语义结论校准：attempts 耗尽后 socket 通道由调用方生命周期重建
 * （client useOrderTracking / rider useRiderSocket），长宕期间是否需要 service worker
 * 级别的重连策略、退避上限是否匹配后端网关重启窗口，均待 D7 结论后回填。
 */

/** 重连总次数上限（耗尽后由调用方生命周期重建通道） */
export const WS_RECONNECTION_ATTEMPTS = 10;

/** 退避基数（首次重连等待，socket.io 内建 delay * 2^n 指数增长） */
export const WS_RECONNECTION_DELAY_MS = 1000;

/** 退避封顶（≈ 1s/2s/4s/8s/16s/30s… 共约 4 分钟窗口，长宕不再高频空转耗电） */
export const WS_RECONNECTION_DELAY_MAX_MS = 30_000;
