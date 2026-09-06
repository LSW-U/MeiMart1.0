#!/usr/bin/env python3
"""
i18n 门禁脚本（key 存在性 + 跨语言对齐 + 未译/占位统计）

三段检查（批B 语言优化升级，对齐 admin/rider 门禁标准）：
1. t() 调用 key 存在性：扫 app/ + src/ 的 t() 调用，检查 key 是否存在于 locale json（默认 en）。
   - ERR（无 defaultValue 且 key 缺失）：运行时显示 key 字面量 → exit 1 拦截
   - warn（有 defaultValue 兜底 且 key 缺失）：fallback 到 defaultValue 不裂，提醒不阻塞
   - 动态 key（t(variable) / template literal 插值）跳过（静态无法检查）
2. 跨语言 key 对齐：以 en 为基线，逐一比对 zh/tet/pt：
   - 缺失（en 有 lang 无）/ 多余（lang 有 en 无）/ 类型不匹配（dict vs 标量）→ exit 1 拦截
   - 插值变量 parity：{{var}} 集合与 en 不一致 → exit 1 拦截（防机翻幻觉变量，批B 审查 #1）
3. 未译/占位统计：占位标记 `[TET] `/`[PT] `/`[ZH] `/`[EN] `/`[ID] ` 前缀视为未译（方案 v2 §2.2，
   不静默回退英文）；未译率 > 0 → exit 1 拦截。与 en 同值仅信息输出（品牌名/COD 等合理同值不拦）。

用法：python3 scripts/check-i18n-keys.py [--locale en] [--skip-usage]

关联：CLAUDE.md 规则 14（核心语言 en+zh，文案提取到 i18n）+ 跨梯队 Q1（a11y 英文残留）
     复发 4+ 次（P8/P9/P10/P11/P13），自动化拦截。
     批B（2026-09）升级跨语对齐 + 未译统计：三端语言优化方案 v2 §2.3。
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LOCALE = 'en'
# 与 src/i18n/index.ts SUPPORTED_LOCALES 保持一致（含本批新增 pt）
ALL_LANGS = ['en', 'zh', 'tet', 'pt']
# 字符类含 . : -（嵌套 key 的 . + i18next namespace 冒号语法 : + 含 - 的 key），预防未来 namespace 冒号 / dash 漏报
T_CALL_RE = re.compile(r"\bt\(\s*['\"`]([a-zA-Z0-9_.:-]+)['\"`]")
# 占位标记（方案 v2 §2.2：未译值统一语言前缀标记，不静默回退英文）
PLACEHOLDER_RE = re.compile(r'^\[(TET|PT|ZH|EN|ID)\] ')
# 插值变量（批B 审查 #1：pt 幻觉 {{amount}} 逃逸——key 集合对齐不查值内容，补插值 parity）
INTERP_RE = re.compile(r'\{\{(\w+)\}\}')


def flatten(obj, prefix=''):
    """嵌套 dict → {dotted.key: value}（标量叶子；list 视为标量叶子）"""
    items = {}
    for k, v in obj.items():
        key = f'{prefix}{k}'
        if isinstance(v, dict):
            items.update(flatten(v, key + '.'))
        else:
            items[key] = v
    return items


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


def load_lang(lang):
    """加载语言 json；不存在返回 None（对齐检查按缺失报）"""
    f = ROOT / 'locales' / f'{lang}.json'
    if not f.exists():
        return None
    return json.loads(f.read_text(encoding='utf-8'))


def check_alignment(baseline, langs_data):
    """跨语言 key 对齐：缺失/多余/类型不匹配，返回 (problems, per_lang_leaf_counts)"""
    base_flat = flatten(baseline)
    problems = []
    counts = {'en': len(base_flat)}
    for lang, data in langs_data.items():
        if data is None:
            problems.append(f'  [{lang}] ❌ locales/{lang}.json 不存在（SUPPORTED_LOCALES 已注册）')
            continue
        lang_flat = flatten(data)
        counts[lang] = len(lang_flat)
        missing = sorted(set(base_flat) - set(lang_flat))
        extra = sorted(set(lang_flat) - set(base_flat))
        mismatch = sorted(
            k for k in set(base_flat) & set(lang_flat)
            if isinstance(base_flat[k], dict) != isinstance(lang_flat[k], dict)
        )
        if missing:
            problems.append(f'  [{lang}] 缺失 {len(missing)} key（en 有 lang 无）:')
            problems.extend(f'    - {k}' for k in missing[:20])
            if len(missing) > 20:
                problems.append(f'    … 其余 {len(missing) - 20} 条省略')
        if extra:
            problems.append(f'  [{lang}] 多余 {len(extra)} key（lang 有 en 无）:')
            problems.extend(f'    + {k}' for k in extra[:20])
            if len(extra) > 20:
                problems.append(f'    … 其余 {len(extra) - 20} 条省略')
        if mismatch:
            problems.append(f'  [{lang}] 结构不匹配（dict vs 标量）{len(mismatch)} 处: {mismatch[:10]}')
        # 插值变量 parity：{{var}} 集合必须与 en 一致（i18next 传参缺失会渲染字面 {{var}}）
        interp_bad = sorted(
            k for k in set(base_flat) & set(lang_flat)
            if isinstance(base_flat[k], str)
            and isinstance(lang_flat[k], str)
            and set(INTERP_RE.findall(base_flat[k])) != set(INTERP_RE.findall(lang_flat[k]))
        )
        if interp_bad:
            problems.append(f'  [{lang}] 插值变量不一致（{{{{var}}}} 集合 vs en）{len(interp_bad)} 处:')
            for k in interp_bad[:20]:
                en_vars = sorted(set(INTERP_RE.findall(str(base_flat[k]))))
                lang_vars = sorted(set(INTERP_RE.findall(str(lang_flat[k]))))
                problems.append(f'    - {k}: en={en_vars} lang={lang_vars}')
            if len(interp_bad) > 20:
                problems.append(f'    … 其余 {len(interp_bad) - 20} 条省略')
    return problems, counts


def check_untranslated(baseline, langs_data):
    """未译/占位统计：占位前缀视为未译（exit 1 线）；与 en 同值仅信息。返回 (blockers, infos)"""
    base_flat = flatten(baseline)
    blockers = []
    infos = []
    for lang, data in langs_data.items():
        if data is None or lang == DEFAULT_LOCALE:
            continue
        lang_flat = flatten(data)
        placeholders = sorted(k for k, v in lang_flat.items() if isinstance(v, str) and PLACEHOLDER_RE.match(v))
        same_as_en = sum(
            1 for k, v in lang_flat.items()
            if k in base_flat and isinstance(v, str) and v == base_flat[k] and k not in placeholders
        )
        total = len(lang_flat)
        rate = len(placeholders) / total * 100 if total else 100.0
        if placeholders:
            blockers.append(
                f'  [{lang}] 未译占位 {len(placeholders)}/{total}（{rate:.1f}%）— 验收线 0：'
            )
            blockers.extend(f'    - {k} = {lang_flat[k]}' for k in placeholders[:15])
            if len(placeholders) > 15:
                blockers.append(f'    … 其余 {len(placeholders) - 15} 条省略')
        else:
            infos.append(f'  [{lang}] 占位 0/{total} ✅（与 en 同值 {same_as_en} 条仅参考，不拦截）')
    return blockers, infos


def main():
    ap = argparse.ArgumentParser(description='i18n 门禁：key 存在性 + 跨语对齐 + 未译统计')
    ap.add_argument('--locale', default=DEFAULT_LOCALE, help=f"t() 扫描基线 locale（默认 {DEFAULT_LOCALE}）")
    ap.add_argument('--skip-usage', action='store_true', help='跳过 t() 调用扫描（只跑对齐 + 未译）')
    args = ap.parse_args()

    baseline = load_lang(args.locale)
    if baseline is None:
        print(f'❌ locale 文件不存在: {ROOT}/locales/{args.locale}.json', file=sys.stderr)
        sys.exit(2)

    exit_code = 0

    # ── 1. t() 调用 key 存在性 ──
    if not args.skip_usage:
        scan_dirs = [ROOT / 'app', ROOT / 'src']
        files, count, missing = scan(baseline, scan_dirs)
        errs = [m for m in missing if m[0] == 'ERR']
        warns = [m for m in missing if m[0] == 'warn']
        print(f'[1/3 t() 存在性] 扫描 {files} 文件，{count} 个 t() 字面量调用，{len(missing)} key 缺失（{len(errs)} ERR / {len(warns)} warn）')
        if errs:
            print('\n❌ ERR（无 defaultValue，运行时显示 key 字面量，必修）：')
            for sev, f, line, key in sorted(errs):
                print(f'  {f}:{line}  t("{key}")')
        if warns:
            print('\n⚠️  warn（有 defaultValue 兜底，建议加正式 key 提升 a11y / 跨语言一致性）：')
            for sev, f, line, key in sorted(warns):
                print(f'  {f}:{line}  t("{key}")')
        if errs:
            exit_code = 1
        print(f'\n{"❌ " + str(len(errs)) + " ERR 阻塞" if errs else "✅ 无 ERR"}（{len(warns)} warn 不阻塞，建议逐步修）')
    else:
        print('[1/3 t() 存在性] 跳过（--skip-usage）')

    # ── 2. 跨语言 key 对齐 ──
    langs_data = {lang: load_lang(lang) for lang in ALL_LANGS}
    align_problems, counts = check_alignment(baseline, langs_data)
    count_str = ' / '.join(f'{lang}={counts.get(lang, "缺")}' for lang in ALL_LANGS)
    print(f'\n[2/3 跨语对齐] 基线 {args.locale}（{counts[args.locale]} key）vs {count_str}')
    if align_problems:
        print('❌ 对齐缺失：')
        print('\n'.join(align_problems))
        exit_code = 1
    else:
        print('✅ zh/tet/pt 与 en 全量对齐（0 缺失 / 0 多余 / 0 结构不匹配 / 0 插值不一致）')

    # ── 3. 未译/占位统计 ──
    blockers, infos = check_untranslated(baseline, langs_data)
    print('\n[3/3 未译统计]（占位标记 [TET]/[PT]… 前缀 = 未译，验收线 0）')
    print('\n'.join(infos) if infos else '')
    if blockers:
        print('\n'.join(blockers))
        exit_code = 1
    print()

    if exit_code:
        print('❌ 门禁拦截（对齐缺失 / 未译占位 / t() ERR 有一即为红），修后重跑')
        sys.exit(exit_code)
    print('✅ 门禁通过：t() 无 ERR、跨语对齐 0 缺失、未译率 0')


if __name__ == '__main__':
    main()
