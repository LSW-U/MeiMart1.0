/**
 * 取证照片本地落盘/清理（批2 R-P1-2 A 方案，D4 拍板）
 *
 * Why：离线时 confirmPickup/confirmDelivery 入队，但队列 payload 只能存 JSON 字符串——
 * 相机返回的 image-picker 临时 URI（cache 目录）在 app 重启后被系统清理，恢复网络后
 * 证据已丢（纠纷零证据）。入队前先把照片复制到 document 目录持久区，路径记入队列
 * payload；恢复后先上传拿 URL 再报状态（证据与状态原子对应，东帝汶弱网 + COD 纠纷场景）。
 *
 * API 用 expo-file-system SDK 54+ 新 File/Directory 类（旧 copyAsync 等 legacy 方法
 * 在 index 顶层 re-export 但运行时 throw，已核 node_modules legacyWarnings）。
 * 上传走 @meimart/upload-core（R6 共享包，与 upload.ts 同一底层）。
 *
 * 后端契约现状：dispatch pickup/deliver 端点（PickupTaskRequest/DeliverTaskRequest）
 * 只有 note/collectedAmount，无 evidence 字段；rider upload 端点矩阵（CAPABILITY-CONTRACT
 * M4，9 端点）也没有「配送取证」场景。A 方案的上传目标端点按保守策略先用 license-image
 * 同款鉴权（CUSTOMER+RIDER、magic bytes 校验、无 1:1 强制）——后续后端补专用端点时只改
 * EVIDENCE_UPLOAD_PATH 一处（上报项见批2 完成回复）。
 */
import * as FileSystem from 'expo-file-system';

import { uploadImageFileWithRetry } from '@meimart/upload-core';

import { API_BASE_URL, isMockMode } from './api';
import { tokenStorage } from './token-storage';

/** 取证文件持久目录：Documents/evidence/（系统不回收，需 app 侧主动清理） */
const EVIDENCE_DIR = 'evidence';

/** 取证上传端点（相对 /api/v1；后端补专用端点时改这一处） */
const EVIDENCE_UPLOAD_PATH = 'common/rider/uploads/license-image';

function evidenceDir(): FileSystem.Directory {
  return new FileSystem.Directory(FileSystem.Paths.document, EVIDENCE_DIR);
}

/**
 * 入队前把临时照片复制到持久目录，返回可长期持有的 file:// URI。
 * 幂等：同 URI 重复落盘覆盖同名文件（文件名含时间戳，实际不会撞）。
 * @throws 复制失败（磁盘满/源文件已被清理）向上抛——调用方入队流程需感知，
 *         宁可入队不带证据也不入队带死路径。
 */
export async function persistEvidencePhoto(tempUri: string): Promise<string> {
  const dir = evidenceDir();
  if (!dir.exists) dir.create({ idempotent: true });
  // 保留扩展名（mime 由后端 magic bytes 复核，扩展名仅上传表单用）
  const ext = tempUri.includes('.') ? tempUri.slice(tempUri.lastIndexOf('.')) : '.jpg';
  const dest = new FileSystem.File(
    dir,
    `evidence-${Date.now()}-${Math.floor(Math.random() * 10_000)}${ext}`,
  );
  // 源可能是 content://（Android）或 file://（iOS cache）；File 构造支持任意 URI 字符串
  await new FileSystem.File(tempUri).copy(dest);
  return dest.uri;
}

/** 恢复同步成功后清理已消费的本地证据文件（失败静默：孤儿文件无害，仅占磁盘） */
export function deleteEvidenceFile(uri: string): void {
  try {
    new FileSystem.File(uri).delete();
  } catch (e) {
    console.warn('[evidence] delete failed:', (e as Error).message);
  }
}

/**
 * P2-2：已上传 URL 的进程内缓存（本地路径 → 远端 URL）。
 * Why：重试轮次里同一本地文件会重复 uploadEvidence（每轮重传产生服务端重复副本，
 * 上传还慢）。同进程内命中即跳过上传直接复用 URL；上报成功删文件时顺带清缓存。
 * 进程重启缓存丢失则重传一次——可接受（正确性不受影响，仅多一次上传）。
 */
const uploadedUrlCache = new Map<string, string>();

/** P2-2：命中缓存直接返回，未命中才真上传并回填缓存（uploadEvidence 语义不变） */
export async function uploadEvidenceCached(
  evidence?: PersistedEvidence,
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  if (!evidence) return urls;
  for (const [field, uri] of Object.entries(evidence)) {
    if (!uri) continue;
    const cached = uploadedUrlCache.get(uri);
    if (cached) {
      urls[field] = cached;
      continue;
    }
  }
  const fresh = await uploadEvidence(
    Object.fromEntries(Object.entries(evidence).filter(([field, uri]) => uri && !urls[field])),
  );
  for (const [field, url] of Object.entries(fresh)) {
    urls[field] = url;
    const uri = evidence[field as keyof PersistedEvidence];
    if (uri) uploadedUrlCache.set(uri, url);
  }
  return urls;
}

/** P2-2：上报成功（或放弃/死信清理）后移除对应缓存项，防 Map 无限增长 */
export function forgetUploadedUrl(uri: string): void {
  uploadedUrlCache.delete(uri);
}

/** P2-3：清空整个 evidence 持久目录（放弃/死信回收孤儿文件用；目录不存在静默通过） */
export function clearEvidenceDir(): void {
  try {
    const dir = evidenceDir();
    if (dir.exists) dir.delete();
  } catch (e) {
    console.warn('[evidence] clear dir failed:', (e as Error).message);
  }
}

/** 队列 payload 内的 evidence 字段（JSON 可序列化，只存本地路径不存对象） */
export type PersistedEvidence = {
  photoUri?: string;
  doorUri?: string;
  packageUri?: string;
};

/**
 * 恢复同步时的「先传证据再报状态」：把本地 evidence URI 逐个上传拿远端 URL。
 * mock 模式短路（对齐 upload.ts uploadTo 行为，返回伪 URL 不实际上传）。
 * 单张失败即抛（UploadError.network 可由上层 attempts 重试；business 类重试无意义
 * 但也不会更糟——attempts 耗尽进死信由 Banner 暴露）。
 */
export async function uploadEvidence(
  evidence?: PersistedEvidence,
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  if (!evidence) return urls;

  for (const [field, uri] of Object.entries(evidence)) {
    if (!uri) continue;
    if (isMockMode) {
      urls[field] = `https://mock-minio.local/meimart/evidence-mock-${Date.now()}.jpg`;
      continue;
    }
    const token = await tokenStorage.get();
    const result = await uploadImageFileWithRetry({
      baseUrl: API_BASE_URL,
      path: EVIDENCE_UPLOAD_PATH,
      fileUri: uri,
      mimeType: 'image/jpeg',
      filename: `evidence-${field}.jpg`,
      token,
      locale: 'en',
    });
    urls[field] = result.url;
  }
  return urls;
}
