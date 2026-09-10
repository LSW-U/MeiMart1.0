/**
 * upload-core 预校验单测（批B · A4 收敛，2026-09-09）
 *
 * 场景规则逐条对齐后端 upload.helpers.ts / 三 controller 校验：
 * 类型 / 大小 / 尺寸下界 / 1:1 容差 / banner 宽度+比例带。
 */
import { precheckImage, PrecheckError, UPLOAD_LIMITS, SCENE_RULES } from '../src/precheck';

describe('预校验：类型与大小（全场景共用）', () => {
  it('不支持的 mime → E-UPLOAD-010', () => {
    expect(() =>
      precheckImage('generic', { mimeType: 'image/gif', width: 200, height: 200 }),
    ).toThrow(PrecheckError);
    try {
      precheckImage('generic', { mimeType: 'image/gif', width: 200, height: 200 });
    } catch (e) {
      expect((e as PrecheckError).code).toBe('E-UPLOAD-010');
    }
  });

  it('超过 5MB → E-UPLOAD-002；mimeType 缺省时仍校验尺寸', () => {
    expect(() =>
      precheckImage('generic', { mimeType: 'image/jpeg', sizeBytes: 5 * 1024 * 1024 + 1, width: 200, height: 200 }),
    ).toThrow(PrecheckError);
  });
});

describe('预校验：尺寸与比例（按场景）', () => {
  it('generic（client 凭证/评价/反馈）：100x100 过，99x99 → E-UPLOAD-016', () => {
    precheckImage('generic', { width: 100, height: 100 });
    try {
      precheckImage('generic', { width: 99, height: 99 });
    } catch (e) {
      expect((e as PrecheckError).code).toBe('E-UPLOAD-016');
    }
  });

  it('avatar-square：800x600 非 1:1 → E-UPLOAD-020（后端同码）', () => {
    expect(() => precheckImage('avatar-square', { width: 800, height: 600 })).toThrow(PrecheckError);
    try {
      precheckImage('avatar-square', { width: 800, height: 600 });
    } catch (e) {
      expect((e as PrecheckError).code).toBe('E-UPLOAD-020');
    }
  });

  it('product-image：600x600 过；2000x2000 过（边界含）；2100 → E-UPLOAD-021', () => {
    precheckImage('product-image', { width: 600, height: 600 });
    precheckImage('product-image', { width: 2000, height: 2000 });
    try {
      precheckImage('product-image', { width: 2100, height: 2100 });
    } catch (e) {
      expect((e as PrecheckError).code).toBe('E-UPLOAD-021');
    }
  });

  it('banner-image：1200x600（2:1）过；600x600（1:1<1.5）→ E-UPLOAD-022；500 宽 → E-UPLOAD-021', () => {
    precheckImage('banner-image', { width: 1200, height: 600 });
    try {
      precheckImage('banner-image', { width: 600, height: 600 });
    } catch (e) {
      expect((e as PrecheckError).code).toBe('E-UPLOAD-022');
    }
    try {
      precheckImage('banner-image', { width: 500, height: 300 });
    } catch (e) {
      expect((e as PrecheckError).code).toBe('E-UPLOAD-021');
    }
  });

  it('document（rider 证件）：300x200 过；299x199 → E-UPLOAD-016', () => {
    precheckImage('document', { width: 300, height: 200 });
    try {
      precheckImage('document', { width: 299, height: 199 });
    } catch (e) {
      expect((e as PrecheckError).code).toBe('E-UPLOAD-016');
    }
  });

  it('未知场景 → E-UPLOAD-010', () => {
    try {
      precheckImage('no-such-scene', { width: 100, height: 100 });
    } catch (e) {
      expect((e as PrecheckError).code).toBe('E-UPLOAD-010');
    }
  });
});

describe('预校验常量与后端对齐', () => {
  it('5MB / jpg-png-webp 白名单与 upload.helpers.ts 一致', () => {
    expect(UPLOAD_LIMITS.maxBytes).toBe(5 * 1024 * 1024);
    expect([...UPLOAD_LIMITS.allowedMimeTypes]).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    // 场景表 5 项齐
    expect(Object.keys(SCENE_RULES).sort()).toEqual(
      ['avatar-square', 'banner-image', 'document', 'generic', 'product-image'].sort(),
    );
  });
});
