#!/usr/bin/env python3
"""
i18n key 存在性检查门禁脚本

扫 app/ + src/ 的 t() 调用，检查 key 是否存在于 locale json（默认 en）。
- ERR（无 defaultValue 且 key 缺失）：运行时显示 key 字面量，exit 1 拦截
- warn（有 defaultValue 兜底 且 key 缺失）：fallback 到 defaultValue 不裂，exit 0 提醒
- 动态 key（t(variable) / template literal 插值）跳过（静态无法检查）

用法：python3 scripts/check-i18n-keys.py [--locale en]

关联：CLAUDE.md 规则 14（核心语言 en+zh，文案提取到 i18n）+ 跨梯队 Q1（a11y 英文残留）
     复发 4+ 次（P8/P9/P10/P11/P13），自动化拦截。
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LOCALE = 'en'
T_CALL_RE = re.compile(r"\bt\(\s*['\"`]([a-zA-Z0-9_.]+)['\"`]")


def key_exists(obj, key):
    """递归检查 key（'afterSales.reasons.expired'）是否存在于嵌套 dict"""
    cur = obj
    for p in key.split('.'):
        if not isinstance(cur, dict) or p not in cur:
            return False
        cur = cur[p]
    return True


def scan(locale_data, scan_dirs):
    missing = []
    count = 0
    files = 0
    for d in scan_dirs:
        if not d.exists():
            continue
        for fp in d.rglob('*'):
            if fp.suffix in ('.tsx', '.ts') and '.test.' not in fp.name:
                files += 1
                text = fp.read_text(encoding='utf-8')
                for m in T_CALL_RE.finditer(text):
                    key = m.group(1)
                    count += 1
                    if not key_exists(locale_data, key):
                        line = text[:m.start()].count('\n') + 1
                        # 检测该调用的 defaultValue（往后找到匹配的 ) 范围内）
                        tail = text[m.end():m.end() + 300]
                        end = tail.find(')')
                        seg = tail[:end if end != -1 else 300]
                        sev = 'warn' if 'defaultValue' in seg else 'ERR'
                        missing.append((sev, str(fp.relative_to(ROOT)), line, key))
    return files, count, missing


def main():
    ap = argparse.ArgumentParser(description='i18n key 存在性检查')
    ap.add_argument('--locale', default=DEFAULT_LOCALE, help=f'locale（默认 {DEFAULT_LOCALE}）')
    args = ap.parse_args()

    locale_file = ROOT / 'locales' / f'{args.locale}.json'
    if not locale_file.exists():
        print(f'❌ locale 文件不存在: {locale_file}', file=sys.stderr)
        sys.exit(2)

    locale_data = json.loads(locale_file.read_text(encoding='utf-8'))
    scan_dirs = [ROOT / 'app', ROOT / 'src']
    files, count, missing = scan(locale_data, scan_dirs)

    errs = [m for m in missing if m[0] == 'ERR']
    warns = [m for m in missing if m[0] == 'warn']

    print(f'扫描 {files} 文件，{count} 个 t() 字面量调用，{len(missing)} key 缺失（{len(errs)} ERR / {len(warns)} warn）')

    if errs:
        print('\n❌ ERR（无 defaultValue，运行时显示 key 字面量，必修）：')
        for sev, f, line, key in sorted(errs):
            print(f'  {f}:{line}  t("{key}")')
    if warns:
        print('\n⚠️  warn（有 defaultValue 兜底，建议加正式 key 提升 a11y / 跨语言一致性）：')
        for sev, f, line, key in sorted(warns):
            print(f'  {f}:{line}  t("{key}")')

    if errs:
        print(f'\n❌ {len(errs)} ERR 阻塞（门禁拦截），修后重跑')
        sys.exit(1)
    print(f'\n✅ 无 ERR（{len(warns)} warn 不阻塞，建议逐步修）')


if __name__ == '__main__':
    main()
