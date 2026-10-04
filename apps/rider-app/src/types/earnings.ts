export type EarningSummary = {
  availableBalance: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
};

/**
 * 批1 T6（N4）：交易行状态——后端 Settlement 视图 status 枚举
 * PENDING/CONFIRMED/PAID/DISPUTED（DISPUTED 不计入 summary/availableBalance，UI 须标注）
 */
export type EarningTxStatus = 'PENDING' | 'CONFIRMED' | 'PAID' | 'DISPUTED';

export type EarningTransaction = {
  id: string;
  orderId?: string;
  amount: number;
  type: 'deliveryFee' | 'bonus' | 'withdrawal';
  /** 批1 T6：后端结算状态透出（mock 行恒 PAID；DISPUTED 行 earnings 页标注「争议中」） */
  status: EarningTxStatus;
  createdAt: string;
  description: string;
};

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 批1 T6（N5/D10）：payout channel 四选一（对齐后端 PayoutAccount 枚举）；
 * WithdrawalRequest.method 由 bank|cash 改为 channel（ WithdrawalRequest 保留给 mock 层历史数据）。
 */
export type PayoutChannel = 'BANK_TRANSFER' | 'WECHAT' | 'ALIPAY' | 'PAYPAL';

export type WithdrawalRequest = {
  id: string;
  amount: number;
  method: 'bank' | 'cash';
  status: WithdrawalStatus;
  createdAt: string;
};

/** 提现表单提交参数（D10）：amount 美元（service 层 ×100 转分），account 必填，其余按渠道选填 */
export type WithdrawalSubmit = {
  amount: number;
  channel: PayoutChannel;
  account: string;
  holderName?: string;
  bankName?: string;
  branchName?: string;
};
