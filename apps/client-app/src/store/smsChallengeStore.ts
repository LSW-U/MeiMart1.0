// SMS-OTP unified 入口的挑战态（批A2-1）
//
// Why 不持久化：challengeId / registrationTicket 都是短生命周期一次性凭证
// （challengeId 随 OTP 5 分钟过期，ticket 消费即 GETDEL），App 重启后必然已废，
// 持久化只会带来「拿着死 ticket 调 complete → 410」的坏路径，内存态过期即废即可。
import { create } from 'zustand';

interface SmsChallengeState {
  /** unified /sms/send 返回的挑战 ID（verify / register/complete 必须回传） */
  challengeId: string | null;
  /** unified /sms/verify 返回 REGISTER 分支时签发的一次性注册票据 */
  registrationTicket: string | null;
  setChallenge: (challengeId: string) => void;
  setRegistrationTicket: (ticket: string) => void;
  clear: () => void;
}

export const useSmsChallengeStore = create<SmsChallengeState>()((set) => ({
  challengeId: null,
  registrationTicket: null,
  setChallenge: (challengeId) => set({ challengeId }),
  setRegistrationTicket: (registrationTicket) => set({ registrationTicket }),
  clear: () => set({ challengeId: null, registrationTicket: null }),
}));
