/**
 * Uploads 上传模块 service 层（P13 B2 售后凭证照片 → upload 模块批A 收敛 2026-09-09）
 *
 * 4 个 client 端点全覆盖（A1 验收线）：
 *   POST /api/v1/client/uploads/refund-evidence  售后凭证（P13）
 *   POST /api/v1/client/uploads/review-image     评价图（P15 B2）
 *   POST /api/v1/client/uploads/feedback-image   反馈截图（G2 修复：此前借道 review-image，
 *                                                反馈图落 reviews/ 前缀语义污染；后端 P22 F2 已备独立端点）
 *   POST /api/v1/client/uploads/avatar           头像（U6 批A 后端落地，G3 修复：去 404 降级注释）
 *
 * 后端校验：CUSTOMER + magic bytes（jpg/png/webp）+ ≤5MB；
 *   凭证/评价/反馈最小 100×100（任意比例），头像 1:1 ≥200×200（E-UPLOAD-019/020）。
 * 返回 { success, data: { url, key, size } }。
 *
 * 底层实现收敛到 @meimart/upload-core（R6 共享包，client/rider 单源）：
 *   fetch + FormData 跨平台 append（web Blob / native {uri,type,name}）+ 一致错误提取。
 *
 * Authorization + Accept-Language 手动注入（与 api.ts axios interceptor 一致）
 * 不走 axios interceptor 的 401 refresh（上传场景 token 通常有效，401 极少；用户重新登录即可）
 */
import { getExtra } from '@/config/app-config';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';
import { getCurrentLocale } from '@/i18n';
import { uploadImageFileWithRetry, type UploadResult } from '@meimart/upload-core';
import { isMockMode } from './api';

const env = getExtra();
const baseURL = env?.API_BASE_URL ?? 'https://api.meimart.example.com';
const TOKEN_KEY = 'meimart.token';

async function getToken(): Promise<string | null> {
  const authState = useAuthStore.getState();
  if (authState.accessToken) return authState.accessToken;
  try {
    const isWeb = typeof document !== 'undefined';
    return isWeb
      ? await AsyncStorage.getItem(TOKEN_KEY)
      : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export type { UploadResult };

/**
 * mock 响应：返回伪造 MinIO URL（不实际上传，500ms 延迟拟真）。
 * submit 时各 mock 业务接口不校验 URL 来源，isOwnUrl 校验跳过。
 */
function mockUploadResult(prefix: string): Promise<UploadResult> {
  const mock: UploadResult = {
    url: `https://mock-minio.local/meimart/${prefix}-mock-${Date.now()}.jpg`,
    key: `${prefix}-mock-${Date.now()}.jpg`,
    size: 1024,
  };
  return new Promise((resolve) => setTimeout(() => resolve(mock), 500));
}

/**
 * 真实上传统一入口（批A 收敛）：4 个端点仅 path/文件名前缀分化。
 * 批B（U2 自动重试）：切 uploadImageFileWithRetry——网络类错误自动重试 2 次（1s→2s 指数退避），
 * 业务类（E-UPLOAD 4xx 校验失败）首次即抛不重试。service 层所有调用方（4 调用点）自动获得重试。
 *
 * @param path 端点相对路径（不含 /api/v1，baseURL 已含前缀）
 * @param fileUri 本地文件 URI（expo-image-picker assets[].uri）
 * @param mimeType MIME 类型（如 image/jpeg）
 * @param basename 文件名主体（如 'evidence' / 'avatar'）
 */
async function uploadTo(
  path: string,
  fileUri: string,
  mimeType: string,
  basename: string,
): Promise<UploadResult> {
  const token = await getToken();
  return uploadImageFileWithRetry({
    baseUrl: baseURL,
    path,
    fileUri,
    mimeType,
    filename: `${basename}.${mimeType.split('/')[1] ?? 'jpg'}`,
    token,
    locale: getCurrentLocale(),
  });
}

export const uploadsApi = {
  /**
   * 上传售后凭证照片（P13 B2）
   * 后端最小 100×100 任意比例，key 落 refunds/evidence-*
   * @param fileUri 本地文件 URI（expo-image-picker assets[].uri）
   * @param mimeType MIME 类型（如 image/jpeg）
   */
  async refundEvidence(fileUri: string, mimeType: string): Promise<UploadResult> {
    if (isMockMode) return mockUploadResult('refunds/evidence');
    return uploadTo('client/uploads/refund-evidence', fileUri, mimeType, 'evidence');
  },

  /**
   * 上传评价图片（P15 RB2）
   * 后端最小 100×100 任意比例，key 落 reviews/image-*
   * @param fileUri 本地文件 URI（expo-image-picker assets[].uri）
   * @param mimeType MIME 类型（如 image/jpeg）
   */
  async reviewImage(fileUri: string, mimeType: string): Promise<UploadResult> {
    if (isMockMode) return mockUploadResult('reviews/image');
    return uploadTo('client/uploads/review-image', fileUri, mimeType, 'image');
  },

  /**
   * 上传反馈截图（G2 修复，upload 模块批A 2026-09-09）
   * 此前 feedback.tsx 借道 reviewImage → 反馈图落 reviews/ 前缀语义污染；
   * 现切独立 feedback-image 端点（P22 F2 后端已备），key 落 feedbacks/image-*，
   * URL 随 POST /client/feedback 的 images[] 落库。
   * @param fileUri 本地文件 URI（expo-image-picker assets[].uri）
   * @param mimeType MIME 类型（如 image/jpeg）
   */
  async feedbackImage(fileUri: string, mimeType: string): Promise<UploadResult> {
    if (isMockMode) return mockUploadResult('feedbacks/image');
    return uploadTo('client/uploads/feedback-image', fileUri, mimeType, 'image');
  },

  /**
   * 上传用户头像（P27 D1 + U6，upload 模块批A 2026-09-09）
   * 后端：POST /api/v1/client/uploads/avatar 已落地（U6）——1:1 ≥200×200
   * （E-UPLOAD-019 尺寸过小 / E-UPLOAD-020 非 1:1），key 落 avatars/avatar-*。
   * 落库：调用方拿到 URL 后 PATCH /client/user/profile 传 avatarUrl（现成链路）。
   * G3 修复：移除「端点待后端新增，404 降级」注释——端点已就绪，真实模式直接可用。
   * @param fileUri 本地文件 URI（expo-image-picker assets[].uri）
   * @param mimeType MIME 类型（如 image/jpeg）
   */
  async avatar(fileUri: string, mimeType: string): Promise<UploadResult> {
    if (isMockMode) return mockUploadResult('avatars/avatar');
    return uploadTo('client/uploads/avatar', fileUri, mimeType, 'avatar');
  },
};
