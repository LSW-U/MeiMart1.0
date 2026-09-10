/**
 * 前端预校验 util（upload 模块批B · A4 收敛，2026-09-09）
 *
 * 批A A4 对照表落地为代码：前端在选图后、发起上传前做与后端一致的规则校验，
 * 拦得住的明显违规（类型 / 大小 / 尺寸 / 比例）不消耗一次弱网往返。
 * 校验失败抛 PrecheckError（code 与后端 E-UPLOAD 对齐，前端直接本地化展示）。
 *
 * ⚠️ 预校验是体验优化不是安全边界——后端逐端点强校验仍是权威（magic bytes 防伪造
 * 只有后端能做）；前端尺寸取自图片元数据可被构造，不作为信任依据。
 *
 * 场景规格来源（批A 对照表 / 方案 v2 §2.1）：
 *   - product-image（admin 主图/图片墙/分类图标）：1:1 容差5% + 200–2000px + ≤5MB
 *   - banner-image（admin banner）：宽 600–2000 + 比例 1.5–3.0 + ≤5MB
 *   - generic（client 凭证/评价/反馈）：≥100×100 任意比例 + ≤5MB
 *   - avatar-square（client/rider 头像）：1:1 + ≥200×200 + ≤5MB
 *   - document（rider 证件）：≥300×200 任意比例 + ≤5MB
 */

/** 预校验失败（code 与后端 E-UPLOAD 对齐） */
export class PrecheckError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'PrecheckError';
    this.code = code;
  }
}

/** 全端点共用常量（与后端 upload.helpers.ts 一致） */
export const UPLOAD_LIMITS = {
  /** 5MB（后端 MAX_FILE_SIZE 一致） */
  maxBytes: 5 * 1024 * 1024,
  /** jpg / png / webp */
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as readonly string[],
  allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'] as readonly string[],
} as const;

/** 场景预校验规则（按批A 对照表逐端点对齐） */
export interface SceneRule {
  /** 最小边 px（generic 100 / avatar 200） */
  minEdge?: number;
  /** 最小宽度 px（rider 证件 300 / banner 600） */
  minWidth?: number;
  /** 最小高度 px（rider 证件 200） */
  minHeight?: number;
  /** 最大边 px（product/banner 2000） */
  maxEdge?: number;
  /** 必须 1:1 */
  square?: boolean;
  /** 1:1 容差（|w/h-1| ≤ tolerance，后端 5%） */
  squareTolerance?: number;
  /** 宽高比区间带 [min, max]（banner 1.5–3.0） */
  ratioRange?: [number, number];
  /** minWidth 违规的错误码覆盖（默认 E-UPLOAD-016；banner 后端用 021 宽度越界） */
  minWidthCode?: string;
}

/** 场景规则表（key 与各端场景名对齐） */
export const SCENE_RULES: Record<string, SceneRule> = {
  // admin 商品图（主图/图片墙/分类图标）：1:1 容差5% + 200–2000px
  'product-image': { minEdge: 200, maxEdge: 2000, square: true, squareTolerance: 0.05 },
  // admin banner：宽 600–2000 + 比例 1.5–3.0（宽度违规后端报 021）
  'banner-image': { minWidth: 600, maxEdge: 2000, ratioRange: [1.5, 3.0], minWidthCode: 'E-UPLOAD-021' },
  // client 凭证/评价/反馈：≥100×100 任意比例
  generic: { minEdge: 100 },
  // client/rider 头像：1:1 ≥200×200
  'avatar-square': { minEdge: 200, square: true, squareTolerance: 0.05 },
  // rider 证件：宽≥300 且 高≥200 任意比例（后端 minW=300/minH=200）
  document: { minWidth: 300, minHeight: 200 },
};

/** 预校验输入（类型/大小/尺寸——尺寸由调用方提供：web Image 解码 / RN picker asset） */
export interface PrecheckInput {
  mimeType?: string;
  /** 文件字节大小（web File.size / RN asset.fileSize，null 跳过大小校验） */
  sizeBytes?: number | null;
  width: number;
  height: number;
}

/**
 * 按场景预校验。
 * @param scene SCENE_RULES 的 key 或自定义 SceneRule
 * @throws PrecheckError（code 与后端 E-UPLOAD 对齐：010 类型 / 016 过小 / 020 非方图 / 021 宽度越界 / 022 比例越界）
 */
export function precheckImage(scene: string | SceneRule, input: PrecheckInput): void {
  const rule = typeof scene === 'string' ? SCENE_RULES[scene] : scene;
  if (!rule) throw new PrecheckError('E-UPLOAD-010', `Unknown upload scene: ${String(scene)}`);

  if (input.mimeType && !UPLOAD_LIMITS.allowedMimeTypes.includes(input.mimeType)) {
    throw new PrecheckError('E-UPLOAD-010', `Unsupported image type: ${input.mimeType}`);
  }
  if (typeof input.sizeBytes === 'number' && input.sizeBytes > UPLOAD_LIMITS.maxBytes) {
    throw new PrecheckError('E-UPLOAD-002', `File too large: ${input.sizeBytes} bytes (max 5MB)`);
  }

  const { width, height } = input;
  if (width <= 0 || height <= 0) {
    throw new PrecheckError('E-UPLOAD-016', `Invalid image dimensions: ${width}x${height}`);
  }

  if (rule.square) {
    const tolerance = rule.squareTolerance ?? 0.05;
    if (Math.abs(width / height - 1) > tolerance) {
      throw new PrecheckError('E-UPLOAD-020', `Image must be 1:1 square (current ${width}x${height})`);
    }
  }
  if (rule.ratioRange) {
    const ratio = width / height;
    const [min, max] = rule.ratioRange;
    if (ratio < min || ratio > max) {
      throw new PrecheckError('E-UPLOAD-022', `Aspect ratio ${width}:${height} out of range ${min}:1 - ${max}:1`);
    }
  }
  if (rule.minEdge !== undefined && Math.min(width, height) < rule.minEdge) {
    throw new PrecheckError('E-UPLOAD-016', `Image too small (current ${width}x${height}, min ${rule.minEdge}px)`);
  }
  if (rule.minWidth !== undefined && width < rule.minWidth) {
    throw new PrecheckError(
      rule.minWidthCode ?? 'E-UPLOAD-016',
      `Image width too small (current ${width}, min ${rule.minWidth}px)`,
    );
  }
  if (rule.minHeight !== undefined && height < rule.minHeight) {
    throw new PrecheckError('E-UPLOAD-016', `Image height too small (current ${height}, min ${rule.minHeight}px)`);
  }
  if (rule.maxEdge !== undefined && Math.max(width, height) > rule.maxEdge) {
    throw new PrecheckError('E-UPLOAD-021', `Image too large (current ${Math.max(width, height)}, max ${rule.maxEdge}px)`);
  }
}
