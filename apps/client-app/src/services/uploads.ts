/**
 * Uploads 上传模块 service 层（P13 B2 售后凭证照片）
 *
 * 后端：POST /api/v1/client/uploads/refund-evidence（upload-client.controller.ts）
 * - multipart/form-data, field name="file"
 * - CUSTOMER 权限 + magic bytes 校验（jpg/png/webp）+ 最小 100×100 + ≤5MB
 * - 返回 { success, data: { url, key, size } }
 *
 * 用 fetch 绕过 axios 默认 Content-Type: application/json（FormData 需 multipart + boundary，
 * fetch + FormData 自动设 Content-Type，不能手动设否则 boundary 丢失）
 *
 * Authorization + Accept-Language 手动注入（与 api.ts axios interceptor 一致）
 * 不走 axios interceptor 的 401 refresh（上传场景 token 通常有效，401 极少；用户重新登录即可）
 */
import { Platform } from 'react-native';
import { getExtra } from '@/config/app-config';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';
import { getCurrentLocale } from '@/i18n';
import { isMockMode } from './api';

// RN FormData 类型扩展：append 接受 {uri,type,name}（RN 运行时支持，DOM lib 类型限 string|Blob）
// 原因：RN FormData.js 的 FormDataValue = string | {name?, type?, uri}，但 TS DOM lib FormData.append 限 string|Blob，
// 需扩展重载让 TS 接受 {uri,type,name}（规则36：用类型扩展替代类型断言）
// 另：web 平台用 Blob 上传（见 appendUploadFile），DOM lib 已有 append(name, Blob, filename) 重载，此处显式声明与 RN 重载并列
declare global {
  interface FormData {
    append(name: string, value: { uri: string; type?: string; name?: string }): void;
    append(name: string, blobValue: Blob, filename?: string): void;
  }
}

const env = getExtra();
const baseURL = env?.API_BASE_URL ?? 'https://api.meimart.example.com';
const TOKEN_KEY = 'meimart.token';
const isWeb = Platform.OS === 'web';

async function getToken(): Promise<string | null> {
  const authState = useAuthStore.getState();
  if (authState.accessToken) return authState.accessToken;
  try {
    return isWeb ? await AsyncStorage.getItem(TOKEN_KEY) : await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

/**
 * 跨平台文件 append：web 用 Blob，native 用 {uri,type,name}
 * 原因：expo-image-picker web 上 assets[].uri 是 blob:/data: URL，
 * FormData.append({uri,type,name}) 在 web 浏览器不识别（web 标准 FormData 接受 Blob/File），
 * 后端收不到有效文件内容 → 400。native 上 RN FormData 支持 {uri,type,name}。
 */
async function appendUploadFile(
  formData: FormData,
  fileUri: string,
  mimeType: string,
  filename: string,
): Promise<void> {
  if (isWeb) {
    const blob = await (await fetch(fileUri)).blob();
    formData.append('file', blob, filename);
  } else {
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: filename,
    });
  }
}

export const uploadsApi = {
  /**
   * 上传售后凭证照片
   * @param fileUri 本地文件 URI（expo-image-picker assets[].uri）
   * @param mimeType MIME 类型（如 image/jpeg）
   */
  async refundEvidence(fileUri: string, mimeType: string): Promise<UploadResult> {
    if (isMockMode) {
      // mock：返回伪造 MinIO URL（不实际上传）。submit 时 mock createRefund 不调后端，isOwnUrl 校验跳过
      const mock: UploadResult = {
        url: `https://mock-minio.local/meimart/refunds/evidence-mock-${Date.now()}.jpg`,
        key: `refunds/evidence-mock-${Date.now()}.jpg`,
        size: 1024,
      };
      return new Promise((resolve) => setTimeout(() => resolve(mock), 500));
    }
    const formData = new FormData();
    // 跨平台 append（web Blob / native {uri,type,name}），见 appendUploadFile
    await appendUploadFile(
      formData,
      fileUri,
      mimeType,
      `evidence.${mimeType.split('/')[1] ?? 'jpg'}`,
    );
    const token = await getToken();
    // Why: baseURL（.env API_BASE_URL）已含 /api/v1，fetch 不像 axios 自动管理 baseURL，路径不再带 /api/v1 前缀（避免重复 .../api/v1/api/v1/...）
    const res = await fetch(`${baseURL}/client/uploads/refund-evidence`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Accept-Language': getCurrentLocale(),
        // 不设 Content-Type：fetch + FormData 自动设 multipart/form-data; boundary=...
      },
      body: formData,
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as
        | { error?: { message?: string }; message?: string }
        | null;
      const msg = errBody?.error?.message ?? errBody?.message ?? `Upload failed (${res.status})`;
      throw new Error(msg);
    }
    const json = (await res.json()) as { success: boolean; data: UploadResult };
    return json.data;
  },

  /**
   * 上传评价图片（P15 RB2，review-image 端点）
   * 后端：POST /api/v1/client/uploads/review-image（upload-client.controller.ts:167）
   * 同 refund-evidence 校验（CUSTOMER + magic bytes + 100×100 + 5MB），仅 MinIO 路径前缀不同 reviews/image-*
   * @param fileUri 本地文件 URI（expo-image-picker assets[].uri）
   * @param mimeType MIME 类型（如 image/jpeg）
   */
  async reviewImage(fileUri: string, mimeType: string): Promise<UploadResult> {
    if (isMockMode) {
      // mock：返回伪造 MinIO URL（不实际上传）。submit 时 mock createReview 不调后端
      const mock: UploadResult = {
        url: `https://mock-minio.local/meimart/reviews/image-mock-${Date.now()}.jpg`,
        key: `reviews/image-mock-${Date.now()}.jpg`,
        size: 1024,
      };
      return new Promise((resolve) => setTimeout(() => resolve(mock), 500));
    }
    const formData = new FormData();
    await appendUploadFile(
      formData,
      fileUri,
      mimeType,
      `image.${mimeType.split('/')[1] ?? 'jpg'}`,
    );
    const token = await getToken();
    const res = await fetch(`${baseURL}/client/uploads/review-image`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Accept-Language': getCurrentLocale(),
      },
      body: formData,
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as
        | { error?: { message?: string }; message?: string }
        | null;
      const msg = errBody?.error?.message ?? errBody?.message ?? `Upload failed (${res.status})`;
      throw new Error(msg);
    }
    const json = (await res.json()) as { success: boolean; data: UploadResult };
    return json.data;
  },

  /**
   * 上传用户头像（P27 D1，avatar 端点）
   * 后端：POST /api/v1/client/uploads/avatar —— ⚠️ 端点待后端新增（P27 方案 §11.1，前缀 avatars/avatar-*）
   * real 模式端点未就绪时 404，调用方 toast 引导（不阻塞 name/email 保存）
   * @param fileUri 本地文件 URI（expo-image-picker assets[].uri）
   * @param mimeType MIME 类型（如 image/jpeg）
   */
  async avatar(fileUri: string, mimeType: string): Promise<UploadResult> {
    if (isMockMode) {
      // mock：返回伪造 MinIO URL（不实际上传）。mock updateProfile 不校验 URL 来源
      const mock: UploadResult = {
        url: `https://mock-minio.local/meimart/avatars/avatar-mock-${Date.now()}.jpg`,
        key: `avatars/avatar-mock-${Date.now()}.jpg`,
        size: 1024,
      };
      return new Promise((resolve) => setTimeout(() => resolve(mock), 500));
    }
    const formData = new FormData();
    await appendUploadFile(
      formData,
      fileUri,
      mimeType,
      `avatar.${mimeType.split('/')[1] ?? 'jpg'}`,
    );
    const token = await getToken();
    const res = await fetch(`${baseURL}/client/uploads/avatar`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Accept-Language': getCurrentLocale(),
      },
      body: formData,
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as
        | { error?: { message?: string }; message?: string }
        | null;
      const msg = errBody?.error?.message ?? errBody?.message ?? `Upload failed (${res.status})`;
      throw new Error(msg);
    }
    const json = (await res.json()) as { success: boolean; data: UploadResult };
    return json.data;
  },
};
