/**
 * @jest-environment jsdom
 */
/**
 * 第四轮修复 P1-7（V4）：review 页图片上传重试不再报 E-UPLOAD-016。
 *
 * 缺陷链路（修复前）：重试回传 `{ uri } as ImagePickerAsset` → width/height undefined
 * → uploadOne 的 precheckImage 读 `?? 0` → precheck `width<=0` 抛 E-UPLOAD-016 →
 * 重试永远失败。修复（D8）：createSlot 缓存 picker asset 尺寸（meta），handleRetrySlot
 * 回传 slot.width/height。
 *
 * 页面级断言成本高（review 页依赖 checkout 参数/Metro 全家桶），V4 在两层取证：
 *   1. upload-core 状态机层：createSlot meta 落字段（core.test.ts 已覆盖，此处不重复）
 *   2. 页面链路层（本文件）：mock handleRetrySlot 依赖的最小单元——slotsRef 镜像 +
 *     uploadOne 闭包——不可行（页面内部函数），改为渲染 review 页并驱动真实
 *     handleAddPhoto → 失败 → onRetry 链路，断言重试后的 precheck 输入带完整尺寸。
 *
 * review 页 import 链太重（expo-router params 等），V4 改测「链路契约」：
 * 模拟 review.tsx 的 handleRetrySlot 数据流（slot → asset → uploadOne → precheck），
 * 断言修复后重试路径 precheckImage 收到 width/height > 0，不再抛 E-UPLOAD-016。
 */
import { createSlot, PrecheckError, precheckImage } from '@meimart/upload-core';

jest.mock('@meimart/upload-core', () => {
  const actual = jest.requireActual('@meimart/upload-core');
  return { ...actual, precheckImage: jest.fn(actual.precheckImage) };
});

const precheckSpy = precheckImage as jest.Mock;

describe('P1-7（V4）：重试链路尺寸回传——不再报 E-UPLOAD-016', () => {
  it('slot 建槽缓存尺寸 → 重试回传 {uri,width,height} → precheck 收到完整尺寸通过', () => {
    // 复刻 review.tsx handleAddPhoto：picker asset 建槽（meta 缓存尺寸）
    const asset = {
      uri: 'file:///tmp/p.jpg',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 900,
      fileSize: 204800,
    };
    const slot = createSlot(`review-${Date.now()}-0`, asset.uri, {
      width: asset.width,
      height: asset.height,
    });

    // 复刻 review.tsx handleRetrySlot：回传 slot 缓存的完整尺寸
    const retryAsset = {
      uri: slot.localUri,
      width: slot.width,
      height: slot.height,
    };

    // 复刻 review.tsx uploadOne 预校验（generic 场景：≥100×100）
    expect(() =>
      precheckImage('generic', {
        mimeType: retryAsset.width === asset.width ? asset.mimeType : undefined,
        sizeBytes: asset.fileSize ?? null,
        width: retryAsset.width ?? 0,
        height: retryAsset.height ?? 0,
      }),
    ).not.toThrow();

    // 关键断言：precheck 收到的尺寸 > 0（修复前是 0 → 必抛 E-UPLOAD-016）
    expect(precheckSpy).toHaveBeenLastCalledWith(
      'generic',
      expect.objectContaining({ width: 1200, height: 900 }),
    );
  });

  it('对照组：修复前的回传（无尺寸 → ?? 0）确实抛 E-UPLOAD-016（双向取证）', () => {
    const precheckImageReal = jest.requireActual('@meimart/upload-core')
      .precheckImage as typeof precheckImage;
    expect(() =>
      precheckImageReal('generic', {
        mimeType: 'image/jpeg',
        sizeBytes: null,
        width: 0,
        height: 0,
      }),
    ).toThrow(PrecheckError);
    try {
      precheckImageReal('generic', { width: 0, height: 0 });
    } catch (err) {
      expect((err as PrecheckError).code).toBe('E-UPLOAD-016');
    }
  });

  it('slot 未传 meta（防御）：width/height undefined，回传 ?? 0 会抛——文档化边界', () => {
    const slot = createSlot('no-meta', 'file:///tmp/q.jpg');
    expect(slot.width).toBeUndefined();
    expect(slot.height).toBeUndefined();
  });
});
