#!/usr/bin/env python3
"""
i18n 门禁脚本（t() 存在性 + 跨语言对齐 + 未译/占位统计）——对齐三端标准
（client-app check-i18n-keys.py 批B 版三段式；方案 v2 §2.3 批次 C）

三段检查：
1. t() 调用 key 存在性：扫 app/ + src/ 的 t('key') 与 translate(x, 'key') 字面量调用，
   检查 key 是否存在于 locale json（默认 en 基线）。缺失 → exit 1 拦截。
   - 动态 key（t(variable) / 模板串）静态无法检查，跳过。
2. 跨语言 key 对齐：以 en 为基线，逐一比对 zh/tet/pt/id（扁平 key 体系）：
   - 缺失（en 有 lang 无）/ 多余（lang 有 en 无）→ exit 1 拦截
   - 插值变量 parity：{var} 集合与 en 不一致 → exit 1 拦截
     （Why: rider 插值是 i18next 风格单大括号 {var}（见 useTranslation.ts interpolate）；
      机翻幻觉变量（pt 幻觉 {{amount}} 是 client 批B 审查 #1 实案）会渲染字面量给用户）
3. 未译/占位统计：占位标记 `[TET] `/`[PT] `/`[ID] `/`[ZH] `/`[EN] ` 前缀视为未译
   （方案 v2 §2.2，不静默回退英文）；**空字符串/纯空白值也视为未译**——rider 历史数据用
   空串占位（270/276/276 处），运行时经 useTranslation 的 `||` 回退链静默显示英文，
   比占位标记更隐蔽，占位正则抓不到（批C 首跑发现的逃逸形态）。未译率 > 0 → exit 1 拦截。
   与 en 同值仅信息输出（品牌名/货币符号等合理同值不拦）。

用法：python3 scripts/check-i18n-keys.py [--locale en] [--skip-usage]
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LOCALE = 'en'
ALL_LANGS = ['en', 'zh', 'tet', 'pt', 'id']
# t('key') 字面量调用（\b 防止 split( 等标识符尾字误配；动态 key 不匹配=跳过）
T_CALL_RE = re.compile(r"\bt\(\s*['\"]([a-zA-Z0-9_.:-]+)['\"]")
# translate(lang, 'key')——服务层 hook 外翻译（第一参可为任意表达式，非贪婪到首个逗号）
TRANSLATE_CALL_RE = re.compile(r"\btranslate\(\s*[^,]+,\s*['\"]([a-zA-Z0-9_.:-]+)['\"]")
# 占位标记（方案 v2 §2.2：未译值统一语言前缀标记，不静默回退英文）
PLACEHOLDER_RE = re.compile(r'^\[(TET|PT|ID|ZH|EN)\] ')
# 插值变量：rider 单大括号 {var}（useTranslation.ts interpolate 用 /\{(\w+)\}/g）
INTERP_RE = re.compile(r'\{(\w+)\}')


def load_lang(lang):
    """加载语言 json；不存在返回 None（对齐检查按缺失报）"""
    f = ROOT / 'src' / 'i18n' / 'locales' / f'{lang}.json'
    if not f.exists():
        return None
    return json.loads(f.read_text(encoding='utf-8'))


def scan(baseline, scan_dirs):
    """扫 t()/translate() 字面量调用，返回 (files, count, missing[(file,line,key)])"""
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
                for regex in (T_CALL_RE, TRANSLATE_CALL_RE):
                    for m in regex.finditer(text):
                        key = m.group(1)
                        count += 1
                        if key not in baseline:
                            line = text[:m.start()].count('\n') + 1
                            missing.append((str(fp.relative_to(ROOT)), line, key))
    return files, count, missing


def check_alignment(baseline, langs_data):
    """跨语言 key 对齐 + 插值 parity，返回 (problems, per_lang_counts)"""
    problems = []
    counts = {'en': len(baseline)}
    for lang, data in langs_data.items():
        if data is None:
            problems.append(f'  [{lang}] ❌ locales/{lang}.json 不存在（注册表已含该语言）')
            continue
        counts[lang] = len(data)
        missing = sorted(set(baseline) - set(data))
        extra = sorted(set(data) - set(baseline))
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
        # 插值变量 parity：{var} 集合必须与 en 一致（机翻幻觉变量渲染字面量给用户）
        interp_bad = sorted(
            k for k in set(baseline) & set(data)
            if isinstance(baseline[k], str) and isinstance(data[k], str)
            and set(INTERP_RE.findall(baseline[k])) != set(INTERP_RE.findall(data[k]))
        )
        if interp_bad:
            problems.append(f'  [{lang}] 插值变量不一致（{{var}} 集合 vs en）{len(interp_bad)} 处:')
            for k in interp_bad[:20]:
                en_vars = sorted(set(INTERP_RE.findall(str(baseline[k]))))
                lang_vars = sorted(set(INTERP_RE.findall(str(data[k]))))
                problems.append(f'    - {k}: en={en_vars} lang={lang_vars}')
            if len(interp_bad) > 20:
                problems.append(f'    … 其余 {len(interp_bad) - 20} 条省略')
    return problems, counts


def check_untranslated(baseline, langs_data):
    """未译/占位统计：占位前缀视为未译（exit 1 线）；与 en 同值仅信息"""
    blockers = []
    infos = []
    for lang, data in langs_data.items():
        if data is None or lang == DEFAULT_LOCALE:
            continue
        placeholders = sorted(k for k, v in data.items() if isinstance(v, str) and PLACEHOLDER_RE.match(v))
        # 空串未译：运行时 useTranslation 的 `lang → en` 回退链对空串（falsy）静默回退英文
        empties = sorted(k for k, v in data.items() if isinstance(v, str) and not v.strip())
        untranslated = placeholders + empties
        same_as_en = sum(
            1 for k, v in data.items()
            if k in baseline and isinstance(v, str) and v == baseline[k] and k not in untranslated
        )
        total = len(data)
        rate = len(untranslated) / total * 100 if total else 100.0
        if untranslated:
            blockers.append(
                f'  [{lang}] 未译 {len(untranslated)}/{total}（{rate:.1f}%）— 验收线 0'
                f'（占位标记 {len(placeholders)} + 空串 {len(empties)}）：'
            )
            blockers.extend(f'    - {k} = {data[k]!r}' for k in untranslated[:15])
            if len(untranslated) > 15:
                blockers.append(f'    … 其余 {len(untranslated) - 15} 条省略')
        else:
            infos.append(f'  [{lang}] 占位 0/空串 0，共 {total} key ✅（与 en 同值 {same_as_en} 条仅参考，不拦截）')
    return blockers, infos


def main():
    ap = argparse.ArgumentParser(description='rider i18n 门禁：t() 存在性 + 跨语对齐 + 未译统计')
    ap.add_argument('--locale', default=DEFAULT_LOCALE, help=f"t() 扫描基线 locale（默认 {DEFAULT_LOCALE}）")
    ap.add_argument('--skip-usage', action='store_true', help='跳过 t() 调用扫描（只跑对齐 + 未译）')
    args = ap.parse_args()

    baseline = load_lang(args.locale)
    if baseline is None:
        print(f'❌ locale 文件不存在: {ROOT}/src/i18n/locales/{args.locale}.json', file=sys.stderr)
        sys.exit(2)

    exit_code = 0

    # ── 1. t() 调用 key 存在性 ──
    if not args.skip_usage:
        files, count, missing = scan(baseline, [ROOT / 'app', ROOT / 'src'])
        print(f'[1/3 t() 存在性] 扫描 {files} 文件，{count} 个 t()/translate() 字面量调用，{len(missing)} key 缺失')
        if missing:
            print('\n❌ 缺失 key（运行时显示 key 字面量，必修）：')
            for f, line, key in sorted(missing):
                print(f'  {f}:{line}  "{key}"')
            exit_code = 1
        else:
            print('✅ 全部字面量 key 存在')
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
        print('✅ zh/tet/pt/id 与 en 全量对齐（0 缺失 / 0 多余 / 0 插值不一致）')

    # ── 3. 未译/占位统计 ──
    blockers, infos = check_untranslated(baseline, langs_data)
    print('\n[3/3 未译统计]（占位标记 [TET]/[PT]/[ID]… 前缀 + 空串值 = 未译，验收线 0）')
    if infos:
        print('\n'.join(infos))
    if blockers:
        print('\n'.join(blockers))
        exit_code = 1
    print()

    if exit_code:
        print('❌ 门禁拦截（t() 缺失 / 对齐缺失 / 未译占位有一即为红），修后重跑')
        sys.exit(exit_code)
    print('✅ 门禁通过：t() 无缺失、跨语对齐 0 缺失、未译率 0')


if __name__ == '__main__':
    main()
