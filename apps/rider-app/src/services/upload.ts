/**
 * Rider Upload service — 骑手证件/头像上传（upload 模块批A 2026-09-09 重写）
 *
 * 旧实现是死代码：打通用 /upload 路径（后端无此端点）且全仓无调用点。
 * 现接 3 个真实端点（W3 已就绪，D7 扩 RIDER 角色后已审核骑手也可调）：
 *   POST /api/v1/common/rider/uploads/avatar          头像（1:1 ≥200×200）
 *   POST /api/v1/common/rider/uploads/id-card-image   身份证图（≥300×200 任意比例）
 *   POST /api/v1/common/rider/uploads/license-image   驾照/车辆证件图（≥300×200 任意比例）
 *
 * - multipart/form-data, field name="file"，CUSTOMER+RIDER 权限（apply 阶段持 client_app token）
 * - 底层收敛到 @meimart/upload-core（R6 共享包，client/rider 单源）
 * - mock 模式返回伪造 MinIO URL（不实际上传），register/profile-edit 可离线演示
 */
import { uploadImageFileWithRetry, type UploadResult } from '@meimart/upload-core';
import { API_BASE_URL, isMockMode } from './api';
import { tokenStorage } from './token-storage';

export type { UploadResult };

/** mock 响应：伪造 MinIO URL（500ms 拟真延迟）。prefix 即端点 path（前缀语义与真实 key 对齐） */
function mockUploadResult(prefix: string): Promise<UploadResult> {
  const mock: UploadResult = {
    url: `https://mock-minio.local/meimart/${prefix}-mock-${Date.now()}.jpg`,
    key: `${prefix}-mock-${Date.now()}.jpg`,
    size: 1024,
  };
  return new Promise((resolve) => setTimeout(() => resolve(mock), 500));
}

/** 当前语言 → Accept-Language（设置本地存储同步读，读不到回退 en） */
function currentLocale(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('mei-delivery-app:rider-settings');
      if (stored) {
        const parsed = JSON.parse(stored) as { language?: string };
        if (parsed.language) return parsed.language;
      }
    }
  } catch {
    // 读设置失败不阻断上传，回退 en
  }
  return 'en';
}

/**
 * 上传统一入口：3 个端点仅 path/文件名分化。
 * 批B（U2 自动重试）：切 uploadImageFileWithRetry——网络类错误自动重试 2 次（1s→2s 指数退避），
 * 业务类（E-UPLOAD 4xx 校验失败）首次即抛不重试。
 *
 * @param path 端点相对路径（不含 /api/v1，API_BASE_URL 已含前缀）
 * @param fileUri 本地文件 URI（expo-image-picker assets[].uri）
 * @param mimeType MIME 类型（如 image/jpeg）
 * @param basename 文件名主体（如 'avatar' / 'idcard' / 'license'）
 */
async function uploadTo(
  path: string,
  fileUri: string,
  mimeType: string,
  basename: string,
): Promise<UploadResult> {
  if (isMockMode) return mockUploadResult(path);
  const token = await tokenStorage.get();
  return uploadImageFileWithRetry({
    baseUrl: API_BASE_URL,
    path,
    fileUri,
    mimeType,
    filename: `${basename}.${mimeType.split('/')[1] ?? 'jpg'}`,
    token,
    locale: currentLocale(),
  });
}

/** 骑手上传 API（端点映射单一来源，单测锚定此处） */
export const riderUploadApi = {
  /** 骑手头像（1:1 ≥200×200，E-UPLOAD-016/017） */
  async avatar(fileUri: string, mimeType: string): Promise<UploadResult> {
    return uploadTo('common/rider/uploads/avatar', fileUri, mimeType, 'avatar');
  },

  /** 身份证图（≥300×200 任意比例，apply 阶段填 idCardImageUrl） */
  async idCardImage(fileUri: string, mimeType: string): Promise<UploadResult> {
    return uploadTo('common/rider/uploads/id-card-image', fileUri, mimeType, 'idcard');
  },

  /** 驾照/车辆证件图（≥300×200 任意比例，apply 阶段填 licenseImageUrl） */
  async licenseImage(fileUri: string, mimeType: string): Promise<UploadResult> {
    return uploadTo('common/rider/uploads/license-image', fileUri, mimeType, 'license');
  },
};
