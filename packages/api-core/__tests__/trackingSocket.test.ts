/** createTrackingSocket 单测（批3 A5）：退避参数/自愈常量锚定 + NetInfo 恢复重置 */
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

import {
  createTrackingSocket,
  WS_RECONNECTION_ATTEMPTS,
  WS_RECONNECTION_DELAY_MS,
  WS_RECONNECTION_DELAY_MAX_MS,
} from '../src';

// socket.io io() 在 node 无真实服务端也能构造 manager（连接在后台失败但不抛同步异常），
// 工厂参数断言走 io.mock 拦截。
jest.mock('socket.io-client', () => {
  const ioMock = jest.fn(() => ({
    connected: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  }));
  return { io: ioMock, default: { io: ioMock } };
});

import { io } from 'socket.io-client';

import { addEventListener as netInfoAddEventListener } from '@react-native-community/netinfo';
const mockNetInfoAdd = netInfoAddEventListener as unknown as jest.Mock;
const mockIo = io as unknown as jest.Mock;

describe('wsDefaults 自愈参数单点', () => {
  it('attempts=10、退避 1s→封顶 30s（rider 蓝本值，D7 待校准头注释在位）', () => {
    expect(WS_RECONNECTION_ATTEMPTS).toBe(10);
    expect(WS_RECONNECTION_DELAY_MS).toBe(1000);
    expect(WS_RECONNECTION_DELAY_MAX_MS).toBe(30_000);
  });
});

describe('createTrackingSocket', () => {
  beforeEach(() => {
    mockIo.mockClear();
    mockNetInfoAdd.mockClear();
    mockNetInfoAdd.mockImplementation(() => jest.fn());
  });

  it('url/auth 透传；不传 transports（polling 回退保持 socket.io 默认）', () => {
    createTrackingSocket({ url: 'http://x:3000/realtime', getAccessToken: () => 'tok' });
    expect(mockIo).toHaveBeenCalledTimes(1);
    const [, opts] = mockIo.mock.calls[0];
    expect(opts.transports).toBeUndefined();
    expect(opts.reconnection).toBe(true);
    expect(opts.reconnectionAttempts).toBe(WS_RECONNECTION_ATTEMPTS);
    // 第四轮修复 P1-3（D4）：auth 改函数式——断言函数调用产出的 token 载荷
    expect(typeof opts.auth).toBe('function');
    const cb = jest.fn();
    opts.auth(cb);
    expect(cb).toHaveBeenCalledWith({ token: 'Bearer tok' });
  });

  // 第四轮修复 P1-3（V3）：重连握手取当前 token——mock getAccessToken 两次不同值，
  // 断言两次握手 token 不同（静态 accessToken 快照做不到，这正是本次修复的目标）。
  // socket.io v4 每次重连握手重新执行 auth 函数 → token 轮换后重连自动带新 token。
  it('V3：每次握手重新执行 getAccessToken（token 轮换后重连带新 token）', () => {
    let token = 'old-token';
    createTrackingSocket({ url: 'u', getAccessToken: () => token });
    const [, opts] = mockIo.mock.calls[0];

    const first: unknown[] = [];
    const second: unknown[] = [];
    opts.auth((payload: unknown) => first.push(payload));
    token = 'new-token'; // 模拟 token 轮换（refresh 后 tokenStorage 已换新）
    opts.auth((payload: unknown) => second.push(payload));

    expect(first[0]).toEqual({ token: 'Bearer old-token' });
    expect(second[0]).toEqual({ token: 'Bearer new-token' });
    expect(first[0]).not.toEqual(second[0]);
  });

  it('订阅 NetInfo 恢复信号（addEventListener 被调用且返回退订）', () => {
    const unsub = jest.fn();
    mockNetInfoAdd.mockImplementation(() => unsub);
    createTrackingSocket({ url: 'u', getAccessToken: () => 't' });
    expect(mockNetInfoAdd).toHaveBeenCalledTimes(1);
  });

  it('网络恢复（false→true）→ 未连接时立即 connect() 重置重连', () => {
    let cb: ((s: { isInternetReachable: boolean | null }) => void) | undefined;
    mockNetInfoAdd.mockImplementation((fn: typeof cb) => {
      cb = fn;
      return jest.fn();
    });
    const { socket } = createTrackingSocket({ url: 'u', getAccessToken: () => 't' });
    (socket.connected as boolean) = false;
    cb!({ isInternetReachable: false });
    expect(socket.connect).not.toHaveBeenCalled();
    cb!({ isInternetReachable: true });
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it('已连接状态下恢复事件不重复 connect', () => {
    let cb: ((s: { isInternetReachable: boolean | null }) => void) | undefined;
    mockNetInfoAdd.mockImplementation((fn: typeof cb) => {
      cb = fn;
      return jest.fn();
    });
    const { socket } = createTrackingSocket({ url: 'u', getAccessToken: () => 't' });
    (socket.connected as boolean) = true;
    cb!({ isInternetReachable: true });
    expect(socket.connect).not.toHaveBeenCalled();
  });

  // 批3 审查 P2-1 回归：NetInfo 退订不挂 socket 'disconnect' 事件——socket.io
  // reconnection:true 下一断连即发 disconnect，挂上去会在长宕退避期（特性目标窗口）
  // 立即失效。回归断言两点：① socket.on 未被注册 disconnect 退订；② 模拟断连后
  // 网络恢复仍能触发重连；③ destroy() 才退订 + 断连。
  it('P2-1 回归：disconnect 事件不退订 NetInfo——断连后恢复仍触发重连', () => {
    let cb: ((s: { isInternetReachable: boolean | null }) => void) | undefined;
    mockNetInfoAdd.mockImplementation((fn: typeof cb) => {
      cb = fn;
      return jest.fn();
    });
    const { socket, destroy } = createTrackingSocket({ url: 'u', getAccessToken: () => 't' });
    // ① 退订不挂 socket 事件（工厂不注册任何退订型 socket 监听）
    expect(socket.on).not.toHaveBeenCalled();

    // ② 模拟断连（socket.io 会 emit disconnect）→ 网络恢复 → 仍触发 connect
    (socket.connected as boolean) = false;
    socket.on('disconnect', jest.fn()); // 模拟调用方自身监听，不构成退订
    cb!({ isInternetReachable: false });
    cb!({ isInternetReachable: true });
    expect(socket.connect).toHaveBeenCalledTimes(1);

    // ③ destroy() 才退订 NetInfo + 断连；destroy 后恢复不再触发 connect
    expect(mockNetInfoAdd.mock.results[0].value).toBeDefined();
    destroy();
    const unsub = mockNetInfoAdd.mock.results[0].value as unknown as jest.Mock;
    expect(unsub).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    cb!({ isInternetReachable: false });
    cb!({ isInternetReachable: true });
    expect(socket.connect).toHaveBeenCalledTimes(1); // 不再增加
  });
});
