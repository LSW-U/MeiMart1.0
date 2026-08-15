// 智能地址识别解析器（P16 决策 9）
// Why: 粘贴一段文本自动拆出姓名/电话/地址。东帝汶地址格式不统一（葡语/tetum/英语混写），
//      MVP 只可靠解析「电话 + 姓名」，地址部分作为整体填 detail 让用户确认修改（方案风险 7）。
export interface ParsedAddressText {
  name: string;
  phone: string;
  detail: string;
}

// 东帝汶号码：可选 +670/670 前缀 + 7~8 位本地号（允许中间空格/横线）；
// 兼容 11 位手机号（3-4 + 4-7 两段贪心可覆盖）
const PHONE_RE = /(\+?670[\s-]?)?\d{3,4}[\s-]?\d{4,7}/;

// 常见街道/地址词（葡语/英语/中文）——含这些词的段是地址不是人名
const STREET_WORDS = /\b(rua|beco|estrada|avenida|av|road|street|lane|no|nr)\b|[街道路巷号]/i;

/** 判断片段是否像人名（含字母/中文且 2~40 字符，不含街道词，数字占比 ≤30%） */
function looksLikeName(seg: string): boolean {
  const trimmed = seg.trim();
  if (trimmed.length < 2 || trimmed.length > 40) return false;
  if (!/[a-zA-Z一-龥]/.test(trimmed)) return false;
  if (STREET_WORDS.test(trimmed)) return false;
  // 数字占比过高（>30%）不像人名（如街道门牌）
  const digits = (trimmed.match(/\d/g) ?? []).length;
  return digits / trimmed.length <= 0.3;
}

export function parseAddressText(raw: string): ParsedAddressText {
  const text = raw.replace(/\r/g, '').trim();
  if (!text) return { name: '', phone: '', detail: '' };

  // 1. 电话：第一个命中的号码段
  const phoneMatch = text.match(PHONE_RE);
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s-]/g, '') : '';

  // 2. 剩余文本按行/逗号分段（去掉电话后）
  const rest = phoneMatch ? text.replace(phoneMatch[0], ' ') : text;
  const segments = rest
    .split(/[\n,，;；]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 3. 姓名：第一个「像人名」的段（通常是电话前的名字或第一行）
  let name = '';
  const nameIdx = segments.findIndex(looksLikeName);
  if (nameIdx >= 0) name = segments[nameIdx];

  // 4. 地址：去掉姓名段后的剩余（若姓名都没识别出，全部当地址）
  const detailSegments = nameIdx >= 0
    ? segments.filter((_, i) => i !== nameIdx)
    : segments;

  return {
    name,
    phone,
    detail: detailSegments.join(', '),
  };
}
