#!/usr/bin/env python3
"""
a11y 静态英文硬编码检查脚本

扫 app/ + src/ 的 accessibilityLabel="英文" 静态硬编码（非 t() 调用）。
E5 a11y 英文两个复发模式：
  ① t() 调用但 key 未加 —— check:i18n 覆盖
  ② 静态 accessibilityLabel="English" 硬编码 —— 本脚本覆盖

warn 级（exit 0 不阻塞）—— 当前存量较多（~54 处），逐步 i18n 化。
接入 pre-commit 时可考虑改 ERR（exit 1）阻塞。

用法：python3 scripts/check-a11y-static.py

关联：CLAUDE.md 规则 7（a11y 属性）+ 规则 14（文案提取到 i18n）
     跨梯队 E5 a11y 英文复发（P8-P13），check:i18n 互补
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCAN_DIRS = [ROOT / 'app', ROOT / 'src']

# accessibilityLabel="英文" 静态硬编码（字母开头，非 t( 调用）
LABEL_RE = re.compile(r'accessibilityLabel="([A-Za-z][^"]*)"')

# 豁免：品牌名 / 产品名 / 通用纯符号（不译）
EXCLUSIONS = {
    'Mei Mart Splash Screen',
    'Mei Mart logo',
    'MeiMart',
}


def main():
    results = []
    files = 0
    for d in SCAN_DIRS:
        if not d.exists():
            continue
        for fp in d.rglob('*'):
            if fp.suffix in ('.tsx', '.ts') and '.test.' not in fp.name:
                files += 1
                text = fp.read_text(encoding='utf-8')
                for m in LABEL_RE.finditer(text):
                    label = m.group(1)
                    if label in EXCLUSIONS:
                        continue
                    line = text[:m.start()].count('\n') + 1
                    results.append((str(fp.relative_to(ROOT)), line, label))

    print(f'扫描 {files} 文件，静态英文 accessibilityLabel: {len(results)} 处')
    # 按文件聚合
    by_file = {}
    for f, line, label in results:
        by_file.setdefault(f, []).append((line, label))
    for f in sorted(by_file):
        for line, label in by_file[f]:
            print(f'  {f}:{line}  "{label}"')

    if results:
        print(f'\n⚠️  {len(results)} 处静态英文 a11y label（warn，建议 i18n 化：t("ns.key") + 加 locale key）')
    else:
        print('\n✅ 无静态英文 a11y label')
    # warn 级，exit 0（不阻塞 commit）


if __name__ == '__main__':
    main()
