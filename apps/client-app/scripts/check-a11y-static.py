#!/usr/bin/env python3
"""
a11y 静态英文硬编码检查脚本

扫 app/ + src/ 的 accessibilityLabel 硬编码英文（非 t() 调用）。
E5 a11y 英文两个复发模式：
  ① t() 调用但 key 未加 —— check:i18n 覆盖
  ② 静态 accessibilityLabel="English" 硬编码 —— 本脚本覆盖

Q6 修复（批3#12）+ 复核修正（批3#12-r2）：原正则仅覆盖双引号纯字面量，扩为三形态：
  ① 双引号 / 单引号纯字面量 accessibilityLabel="English"
  ② 模板字面量 accessibilityLabel={`...`}
模板字面量再按是否含 ${...} 插值分两类计数：
  - 动态模板 label（含插值）：文本随运行时数据变化（如 `${name}, price ${p}`），
    本身不是「静态英文串」，单独归类计数不进静态存量（复核 2026-09-30 拍板）；
    其插值间的静态英文骨架（如 'items in cart'）留待 i18n 化时顺手处理，不在此误报。
  - 纯静态模板（无插值，如 `Slide one`）：与双/单引号同性质，计入静态存量。
t() 开头的混拼模板（`${t('ns.key')} ...`）同属动态模板（主体已是 i18n 文案）。

warn 级（exit 0 不阻塞）。接入 pre-commit 时可考虑改 ERR（exit 1）阻塞。

用法：python3 scripts/check-a11y-static.py [--self-check]

关联：CLAUDE.md 规则 7（a11y 属性）+ 规则 14（文案提取到 i18n）
     跨梯队 E5 a11y 英文复发（P8-P13），check:i18n 互补
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCAN_DIRS = [ROOT / 'app', ROOT / 'src']

# 三形态一网打尽：双引号 / 单引号 / 模板字面量（\{? 可选花括号前缀）。
# 模板组捕获完整字面段，插值判定在 main 里做（含 ${ 则为动态模板）。
LABEL_RE = re.compile(
    r'''accessibilityLabel=\{?(?:"([A-Za-z][^"]*)"|'([A-Za-z][^']*)'|`([^`]*)`)'''
)

# 模板内插值形态 ${...}
INTERP_RE = re.compile(r'\$\{')

# 豁免：品牌名 / 产品名 / 通用纯符号（不译）
EXCLUSIONS = {
    'Mei Mart Splash Screen',
    'Mei Mart logo',
    'MeiMart',
}


def self_check():
    """--self-check: 内置样例断言正则三类形态命中 + 静态/动态归类正确（防再次失真）"""
    cases = [
        # (code, 期望命中, 期望归类: 'static'|'dynamic'|None)
        ('accessibilityLabel="Slide one"', True, 'static'),
        ("accessibilityLabel='Remove item'", True, 'static'),
        ('accessibilityLabel={`Slide ${i + 1}`}', True, 'dynamic'),
        ('accessibilityLabel={`Price ${p}`}', True, 'dynamic'),
        ('accessibilityLabel={`Pure static tpl`}', True, 'static'),
        ('accessibilityLabel={t("common.back")}', False, None),
    ]
    ok = True
    for code, should_match, kind in cases:
        m = LABEL_RE.search(code)
        if bool(m) != should_match:
            print(f'❌ self-check 失败（命中性）: {code}')
            ok = False
            continue
        if m and kind:
            label = next((g for g in m.groups() if g), '')
            got = 'dynamic' if INTERP_RE.search(label) else 'static'
            if got != kind:
                print(f'❌ self-check 失败（归类 {got}≠{kind}）: {code}')
                ok = False
    print('✅ self-check 通过' if ok else 'self-check 未通过')
    return ok


def main():
    if '--self-check' in sys.argv:
        sys.exit(0 if self_check() else 1)

    static_results = []  # (file, line, label) 真静态英文
    dynamic_results = []  # (file, line, label) 含插值的动态模板（不属静态英文）
    files = 0
    for d in SCAN_DIRS:
        if not d.exists():
            continue
        for fp in d.rglob('*'):
            if fp.suffix in ('.tsx', '.ts') and '.test.' not in fp.name:
                files += 1
                text = fp.read_text(encoding='utf-8')
                for m in LABEL_RE.finditer(text):
                    # 三捕获组（双引号/单引号/模板）取第一个非空
                    label = next((g for g in m.groups() if g), '')
                    if not label or label in EXCLUSIONS:
                        continue
                    line = text[:m.start()].count('\n') + 1
                    rel = str(fp.relative_to(ROOT))
                    if INTERP_RE.search(label):
                        dynamic_results.append((rel, line, label))
                    else:
                        static_results.append((rel, line, label))

    def dump(rows):
        by_file = {}
        for f, line, label in rows:
            by_file.setdefault(f, []).append((line, label))
        for f in sorted(by_file):
            for line, label in by_file[f]:
                print(f'  {f}:{line}  "{label}"')

    print(f'扫描 {files} 文件')
    print(f'\n== 静态英文 accessibilityLabel: {len(static_results)} 处（真静态，i18n 化清单） ==')
    dump(static_results)
    print(
        f'\n== 动态模板 label（含 ${{}} 插值，运行时文本，不属静态英文）: {len(dynamic_results)} 处 =='
    )
    dump(dynamic_results)

    if static_results:
        print(
            f'\n⚠️  {len(static_results)} 处静态英文 a11y label'
            f'（warn，建议 i18n 化：t("ns.key") + 加 locale key）；'
            f'另有 {len(dynamic_results)} 处动态模板 label 不计入静态存量'
        )
    else:
        print('\n✅ 无静态英文 a11y label')
    # warn 级，exit 0（不阻塞 commit）


if __name__ == '__main__':
    main()
