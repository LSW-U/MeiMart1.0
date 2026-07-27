/**
 * 规格模板配置（§9 Q1 方案 A — 前端配置映射）
 *
 * Why: 后端暂无 variant/SKU 接口，按 product.category 查本地规格模板，
 *      让多规格商品的规格选择器立即跑起来。当前所有商品单 SKU，选规格不改价
 *      （过渡态，后端 variant API 就绪后由其接管价格/库存联动）。
 *
 * 视觉规范（§11.4）：
 *  - 无规格的 category 不出现在本表 → 选择器整体隐藏（不显示空选择器）
 *  - 缺货规格用 disabled: true → pill 渲染删除线 + 半透明（保留可见，不直接隐藏）
 */

export interface VariantOption {
  label: string;
  /** true = 该规格缺货，pill 禁用（删除线 + 半透明） */
  disabled?: boolean;
}

export interface VariantGroup {
  /** 规格组名（i18n key 或直接展示文本） */
  name: string;
  options: VariantOption[];
}

/**
 * 按 product.category 映射规格模板。
 * 仅 coffee / rice 有规格组；fruits / eggs / dairy 等单品不在表内 → 选择器隐藏。
 */
export const variantTemplates: Record<string, VariantGroup[]> = {
  coffee: [
    {
      name: 'Grind',
      options: [
        { label: 'Fine' },
        { label: 'Medium' },
        { label: 'Coarse' },
        { label: 'Whole Bean', disabled: true }, // 测试缺货规格（删除线 + 半透明）
      ],
    },
    {
      name: 'Weight',
      options: [
        { label: '100g' },
        { label: '250g' },
        { label: '500g' },
        { label: '1kg', disabled: true },
      ],
    },
  ],
  rice: [
    {
      name: 'Weight',
      options: [{ label: '1kg' }, { label: '5kg' }, { label: '10kg' }],
    },
  ],
  // fruits / vegetables / meat 等单品：无规格（不在 map 里 → 选择器隐藏）
};

/**
 * 取某 category 的规格组，无则返回空数组（调用方据此隐藏整个选择器）。
 */
export function getVariantGroups(category: string): VariantGroup[] {
  return variantTemplates[category] ?? [];
}
