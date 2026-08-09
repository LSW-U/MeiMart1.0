import { REASON_KEY_TO_ENUM, REFUND_REASONS } from '@/services/refunds';

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
