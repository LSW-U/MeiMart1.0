import { REASON_KEY_TO_ENUM, REFUND_REASONS } from '@/services/refunds';

// P3-4（批4 审查修复）：对账数据源改为 locales/en.json 真值（防映射表漏 key 不报）。
// 用相对路径 require——moduleNameMapper 只映射 @/ → src/，locales 不在映射内。
const enLocales = require('../../locales/en.json') as {
  afterSales: { reasons: Record<string, string> };
};
const ALL_REASON_KEYS = Object.keys(enLocales.afterSales.reasons);

// detail 页展示专用 key（after-sales-detail.tsx REFUND_REASON_TO_I18N_KEY 反向展示：
// 后端 enum → i18n 文案），apply 页不提交这些原因，REASON_KEY_TO_ENUM 无映射属预期。
// 本清单必须与 detail 页映射表同步维护：若 detail 页新增可提交原因，须同步补 REASON_KEY_TO_ENUM。
const DISPLAY_ONLY_KEYS = ['outOfStock', 'deliveryTooSlow', 'changeMind', 'qualityIssue', 'other'];

describe('refunds service', () => {
  describe('REASON_KEY_TO_ENUM', () => {
    // Why: 5 前端 i18n key 必须全映射到后端 RefundReason enum（提交时转，前后端 reason 语义解耦）
    it('maps all 5 frontend i18n keys to backend RefundReason enum', () => {
      expect(REASON_KEY_TO_ENUM['afterSales.reasons.expired']).toBe('EXPIRED');
      expect(REASON_KEY_TO_ENUM['afterSales.reasons.damaged']).toBe('QUALITY_ISSUE');
      expect(REASON_KEY_TO_ENUM['afterSales.reasons.wrongItem']).toBe('WRONG_ITEM');
      expect(REASON_KEY_TO_ENUM['afterSales.reasons.shortage']).toBe('SHORTAGE');
      expect(REASON_KEY_TO_ENUM['afterSales.reasons.quality']).toBe('QUALITY_ISSUE');
    });

    it('covers all 5 frontend reason keys (no missing mapping)', () => {
      const frontendKeys = ['expired', 'damaged', 'wrongItem', 'shortage', 'quality'];
      for (const k of frontendKeys) {
        expect(REASON_KEY_TO_ENUM[`afterSales.reasons.${k}`]).toBeDefined();
      }
    });

    // P3-4（批4 审查修复）：从 afterSales.reasons（en.json 10 key）反查 REASON_KEY_TO_ENUM 对账。
    // apply 页可提交原因必须全映射（漏映射会静默落 OTHER 提交错语义）；detail 页展示专用
    // key 的未映射须显式列出（写明预期），不允许沉默吞掉新增 key。
    it('en.json 全量 reasons 反查对账：可提交 5 key 全映射 + 展示专用 5 key 显式豁免', () => {
      expect(ALL_REASON_KEYS).toHaveLength(10);
      const unmapped = ALL_REASON_KEYS.filter(
        (k) => !(`afterSales.reasons.${k}` in REASON_KEY_TO_ENUM),
      );
      // 未映射集合必须恰好等于 detail 页展示专用清单（新增 key 未映射会被此断言拦截）
      expect([...unmapped].sort()).toEqual([...DISPLAY_ONLY_KEYS].sort());
      // 反向：映射表里的 key 都真实存在于 locales（防映射表挂幽灵 key）
      for (const fullKey of Object.keys(REASON_KEY_TO_ENUM)) {
        const shortKey = fullKey.replace('afterSales.reasons.', '');
        expect(ALL_REASON_KEYS).toContain(shortKey);
      }
    });

    // Why: submit 层 `REASON_KEY_TO_ENUM[values.reason] ?? 'OTHER'` 兜底（after-sales-apply.tsx mutateAsync payload reason）
    it('returns undefined for unknown key (submit layer falls back to OTHER)', () => {
      expect(REASON_KEY_TO_ENUM['afterSales.reasons.unknown']).toBeUndefined();
      expect(REASON_KEY_TO_ENUM['afterSales.reasons.unknown'] ?? 'OTHER').toBe('OTHER');
    });
  });

  describe('REFUND_REASONS', () => {
    // Why: 后端 P13 扩展 EXPIRED/SHORTAGE，前端 enum 必须同步（防后端扩展时前端漏同步导致 400）
    it('contains all 8 backend RefundReason values including P13 new EXPIRED/SHORTAGE', () => {
      expect(REFUND_REASONS).toHaveLength(8);
      expect(REFUND_REASONS).toContain('OUT_OF_STOCK');
      expect(REFUND_REASONS).toContain('EXPIRED');
      expect(REFUND_REASONS).toContain('QUALITY_ISSUE');
      expect(REFUND_REASONS).toContain('WRONG_ITEM');
      expect(REFUND_REASONS).toContain('SHORTAGE');
      expect(REFUND_REASONS).toContain('DELIVERY_TOO_SLOW');
      expect(REFUND_REASONS).toContain('CUSTOMER_CHANGE_MIND');
      expect(REFUND_REASONS).toContain('OTHER');
    });
  });
});
