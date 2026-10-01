// 批4（任务书 2）：client tokenStorage 改薄壳 —— 平台分支/接口实现上收
// @meimart/api-core createTokenStorage，本文件只注入端侧差异（adapter + 存储 key
// 参数化，'meimart.*' key 定义 client 侧仅此 1 处，验收⑤）。
// get/set/getRefresh/clear 接口语义不变；uploads.ts / authStore / useAuth 等调用方
// import 路径与符号零变更。
import { createTokenStorage } from '@meimart/api-core';
import { clientTokenAdapter } from './token-adapter';

const TOKEN_KEY = 'meimart.token';
const REFRESH_KEY = 'meimart.refresh';

export const tokenStorage = createTokenStorage({
  tokenKey: TOKEN_KEY,
  refreshKey: REFRESH_KEY,
  adapter: clientTokenAdapter,
});
