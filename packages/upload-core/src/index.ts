/**
 * @meimart/upload-core — MeiMart1.0 三端共享上传核心（R6，upload 模块批A 2026-09-09）
 *
 * 单源共享：client-app + rider-app 共用「fetch + FormData 跨平台上传」核心逻辑；
 * 两 app 的 service 层（client uploads.ts / rider services/upload.ts）各自组装
 * 端点/token/locale 差异，本包只管与平台相关的通用部分。
 *
 * 后端端点全集（契约 packages/api-contract，Q1 同步）：
 *   client（CUSTOMER）：/client/uploads/refund-evidence | review-image | feedback-image | avatar
 *   rider（CUSTOMER+RIDER，common 前缀）：/common/rider/uploads/avatar | id-card-image | license-image
 *   admin（MeiMart 仓 admin-web 不消费本包）
 *
 * 批B（2026-09-09）新增：
 *   - error.ts：UploadError 错误分类（network 可自动重试 / business 校验失败不重试，U2）
 *   - retry.ts：uploadImageFileWithRetry 自动重试 2 次指数退避（U2）
 *   - upload-state.ts：图片位状态机（U3 内联进度 + 手动重试兜底）
 *   - precheck.ts：前端预校验（A4 对照表落地，类型/大小/尺寸/比例按场景）
 *   - index.ts 改纯 re-export（本体在 core.ts，避免 index→retry→index 循环引用）
 */
export * from './core';
export * from './error';
export * from './retry';
export * from './upload-state';
export * from './precheck';
