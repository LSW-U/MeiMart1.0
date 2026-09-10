/**
 * PhotoUploadTile props（upload 模块批B · U3/U4 统一图片位组件）
 */
export interface PhotoUploadTileProps {
  /** 图片位状态：空位（undefined，渲染添加按钮）/ uploading（拟真进度）/ done（预览+删除）/ error（保留预览+重试/删除） */
  state?: 'uploading' | 'done' | 'error';
  /** 本地预览 URI（uploading/error 态必传；done 态传远程 URL 亦可） */
  uri?: string;
  /** 拟真进度 0-100（uploading 态展示，done 态忽略） */
  progress?: number;
  /** 失败类别（error 态）：network 提示可重试，business 提示换一张 */
  errorKind?: 'network' | 'business';
  /** 后端/预校验错误码（error 态；映射 locales errors.E-UPLOAD-*，无码回退通用文案） */
  errorCode?: string;
  /** 空位占位文案（添加按钮下方，如 "Add" / "1 / 3"） */
  addLabel?: string;
  /** 添加按钮 a11y label（既有测试断言 afterSales.addPhotoA11y 等） */
  addA11yLabel: string;
  /** 上传中 a11y 提示（读屏：N% / Uploading） */
  uploadingA11yLabel?: string;
  /** 重试按钮 a11y label */
  retryA11yLabel?: string;
  /** 删除按钮 a11y label（done/error 态渲染删除钮） */
  deleteA11yLabel?: string;
  /** 错误提示文案（error 态覆盖在缩略图下方；无则不渲染错误行） */
  errorMessage?: string;
  /** 重试文案（error 态重试按钮；缺省用 icon only） */
  retryLabel?: string;
  /** 点添加（空位） */
  onAdd?: () => void;
  /** 点重试（error 态） */
  onRetry?: () => void;
  /** 点删除（done/error 态） */
  onDelete?: () => void;
  /** 添加按钮 disabled（多为上传中 / 已满） */
  disabled?: boolean;
  /** 尺寸（px，正方形；缺省 72 与既有 photoThumb 一致） */
  size?: number;
  /** 测试 ID（空位用 testID；缩略图/删除/重试派生 `${testID}-remove` 等） */
  testID?: string;
  /** 删除按钮 testID 覆盖（既有页面测试断言 `${page}-remove-photo-N` 派生式时用） */
  removeTestID?: string;
}
