import { useSmsChallengeStore } from '../smsChallengeStore';

describe('smsChallengeStore', () => {
  beforeEach(() => {
    useSmsChallengeStore.getState().clear();
  });

  it('初始为空', () => {
    expect(useSmsChallengeStore.getState().challengeId).toBeNull();
    expect(useSmsChallengeStore.getState().registrationTicket).toBeNull();
  });

  it('setChallenge 存 challengeId', () => {
    useSmsChallengeStore.getState().setChallenge('chal-1');
    expect(useSmsChallengeStore.getState().challengeId).toBe('chal-1');
  });

  it('setRegistrationTicket 存 ticket，与 challengeId 互不覆盖', () => {
    useSmsChallengeStore.getState().setChallenge('chal-2');
    useSmsChallengeStore.getState().setRegistrationTicket('ticket-2');
    expect(useSmsChallengeStore.getState().challengeId).toBe('chal-2');
    expect(useSmsChallengeStore.getState().registrationTicket).toBe('ticket-2');
  });

  it('clear 清空两者', () => {
    useSmsChallengeStore.getState().setChallenge('chal-3');
    useSmsChallengeStore.getState().setRegistrationTicket('ticket-3');
    useSmsChallengeStore.getState().clear();
    expect(useSmsChallengeStore.getState().challengeId).toBeNull();
    expect(useSmsChallengeStore.getState().registrationTicket).toBeNull();
  });
});
