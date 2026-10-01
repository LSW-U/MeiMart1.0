// 批4（任务书 3）：token-storage 改薄壳 —— 平台分支/接口实现上收 @meimart/api-core
// createTokenStorage，本文件只注入端侧差异（adapter + 存储 key 参数化，key 定义全仓
// rider 侧仅此 1 处，验收⑤）。get/set/setAccess/getRefresh/clear 接口语义不变，
// 调用方（api.ts / useAuthStore / useAuth / useBackgroundTask / evidence / upload / user）
// import 路径与符号零变更。
import { createTokenStorage } from '@meimart/api-core';
import { riderTokenAdapter } from './token-adapter';

const TOKEN_KEY = 'mei-delivery.token';
const REFRESH_KEY = 'mei-delivery.refresh';

export const tokenStorage = createTokenStorage({
  tokenKey: TOKEN_KEY,
  refreshKey: REFRESH_KEY,
  adapter: riderTokenAdapter,
});
