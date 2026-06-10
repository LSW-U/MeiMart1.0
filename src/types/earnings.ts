export type EarningSummary = {
  availableBalance: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
};

export type EarningTransaction = {
  id: string;
  orderId?: string;
  amount: number;
  type: 'deliveryFee' | 'bonus' | 'withdrawal';
  createdAt: string;
  description: string;
};

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type WithdrawalRequest = {
  id: string;
  amount: number;
  method: 'bank' | 'cash';
  status: WithdrawalStatus;
  createdAt: string;
};
