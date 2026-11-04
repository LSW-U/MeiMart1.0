import { shouldSuggest } from '../searchSuggestGate';

describe('shouldSuggest — 联想门槛（CJK 单字放行）', () => {
  it.each([
    // CJK 单字：放行（bug 主场景：'米' 原被 length>=2 误拦）
    ['米', true],
    // CJK 词：放行
    ['大米', true],
    // 拉丁单字母：拦（防噪音，C方案 §4.1 原意）
    ['a', false],
    // 拉丁 ≥2：放行
    ['ap', true],
    ['rice', true],
    // 空白：拦
    ['   ', false],
    ['', false],
    // CJK 混拉丁：放行（含 CJK 即视为有意输入）
    ['米a', true],
  ])('%j → %j', (input, expected) => {
    expect(shouldSuggest(input)).toBe(expected);
  });
});
