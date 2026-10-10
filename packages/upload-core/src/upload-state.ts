/**
 * 图片位上传状态机（upload 模块批B · U3 内联进度 + U2 手动兜底，2026-09-09）
 *
 * 单个图片位的生命周期：
 *   idle → picking（选图）→ uploading（内联进度 progress 0-100）→ done（保留预览，可替换/删除）
 *   uploading → error（失败保留预览 + 重试按钮；网络类耗尽自动重试后进入，业务类直接进入）
 *   error → uploading（手动重试，重新走整轮自动重试）
 *
 * 进度口径：fetch 无原生上传进度回调（RN/XHR 差异大，MVP 不做字节级进度），
 * 用「阶段拟真」：发起前 0 → 收到响应头 60 → 解析完成 100（配合不确定态 spinner）。
 * 这满足 E1「有内联进度、不假死」——展示的是阶段而非字节，不误导为下载式精确进度。
 */

/** 图片位状态 */
export type UploadSlotState = 'idle' | 'uploading' | 'done' | 'error';

/** 图片位运行时数据（组件持有） */
export interface UploadSlot {
  /** 图片位唯一 key（多图场景区分） */
  id: string;
  state: UploadSlotState;
  /** 本地预览 URI（选图后立即可预览，上传中/失败态都保留） */
  localUri?: string;
  /** 上传成功后的远程 URL（done 态有值） */
  remoteUrl?: string;
  /** 拟真进度 0-100（uploading 态） */
  progress: number;
  /** 失败信息（error 态；已提取的可读 message） */
  errorMessage?: string;
  /** 失败错误码（error 态；如 E-UPLOAD-020，本地化映射用） */
  errorCode?: string;
  /** 失败类别（error 态；network 类提示「点重试」，business 类提示「换一张」） */
  errorKind?: 'network' | 'business';
  /** 图片宽 px（第四轮修复 P1-7/D8：重试回传用——error 态保留预览，尺寸随 slot 缓存） */
  width?: number;
  /** 图片高 px（同上） */
  height?: number;
}

/**
 * 创建图片位（idle 或 uploading）。
 * 第四轮修复 P1-7/D8：可选 meta { width, height }——选图时把 picker asset 尺寸存进 slot，
 * 手动重试回传 { uri, width, height }（原回传 as ImagePickerAsset 尺寸字段 undefined，
 * precheckImage 读到 0 必报 E-UPLOAD-016「图片过小」，重试永远失败）。签名向后兼容
 * （可选参数，既有调用方零改动）。
 */
export function createSlot(
  id: string,
  localUri?: string,
  meta?: { width?: number; height?: number },
): UploadSlot {
  return {
    id,
    state: localUri ? 'uploading' : 'idle',
    localUri,
    progress: 0,
    ...(meta?.width !== undefined ? { width: meta.width } : {}),
    ...(meta?.height !== undefined ? { height: meta.height } : {}),
  };
}

/** 阶段推进：请求发出 60（响应头已到） */
export function slotToUploading(slot: UploadSlot): UploadSlot {
  return { ...slot, state: 'uploading', progress: 60 };
}

/** 成功：进度 100，落远程 URL */
export function slotToDone(slot: UploadSlot, remoteUrl: string): UploadSlot {
  return { ...slot, state: 'done', progress: 100, remoteUrl };
}

/** 失败：保留本地预览 + 错误信息（重试按钮由组件按 errorKind 渲染） */
export function slotToError(slot: UploadSlot, err: unknown): UploadSlot {
  const isUploadError = err instanceof Error && err.name === 'UploadError';
  const code = isUploadError ? (err as { code?: string }).code : undefined;
  const kind = isUploadError ? (err as { kind?: string }).kind : undefined;
  return {
    ...slot,
    state: 'error',
    errorMessage: err instanceof Error ? err.message : String(err),
    errorCode: code,
    errorKind: kind === 'business' ? 'business' : 'network',
  };
}
