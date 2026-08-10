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
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/authStore';
import { getCurrentLocale } from '@/i18n';
import { isMockMode } from './api';

const env = Constants.expoConfig?.extra as { API_BASE_URL: string };
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
    // 原因：RN FormData 接受 {uri,type,name}（RN 扩展），TS DOM lib 类型限 string|Blob，需断言
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name: `evidence.${mimeType.split('/')[1] ?? 'jpg'}`,
    } as unknown as Blob);
    const token = await getToken();
    const res = await fetch(`${baseURL}/api/v1/client/uploads/refund-evidence`, {
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
};
