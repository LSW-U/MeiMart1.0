#!/usr/bin/env python3
"""
icon symbol 映射门禁（数据层工程治理 批3 D8/V3-2，Q6 语义：存量记账不拦截 / 新增拦截）

背景：symbolToMc 缺映射静默兜底 circle-outline（iconMapping.ts），历史上 3 次用户实测
才发现（promotions stars / 换一批 refresh / 地址 content_paste）。批3 已给 symbolToMc
补 __DEV__ console.warn 运行时告警；本 gate 在编译期把差集拦住：
  - 扫描 client-app app/ + src/（非测试文件）中三类 symbol 字面量：
      JSX 属性   symbol="shopping_cart"
      对象字段   symbol: 'check_circle'
      直调翻译   symbolToMc('add')
  - 与映射表源 src/theme/iconMapping.ts 的 key 集合求差集
  - 命中与 baseline scripts/gate/icon-symbol-baseline.json 对账：
      全部在基线内 → 记账 exit 0；基线外新增 → exit 1 列明 文件:行:symbol
  - 新映射应加进 iconMapping.ts（正向修法），而非把缺映射塞进基线长期记账

用法：
  python3 scripts/gate/icon-symbol-check.py                # 正式扫描（对账基线）
  python3 scripts/gate/icon-symbol-check.py --dump-baseline # 输出当前命中（生成基线用）
  python3 scripts/gate/icon-symbol-check.py --self-test     # 构造样例自验 exit 语义
"""
import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent  # 仓根（scripts/gate/ 上两级）
BASELINE = Path(__file__).resolve().parent / 'icon-symbol-baseline.json'
CLIENT = ROOT / 'apps' / 'client-app'
MAPPING_FILE = CLIENT / 'src' / 'theme' / 'iconMapping.ts'

SCAN_ROOTS = [CLIENT / 'app', CLIENT / 'src']

# 与 iconMapping.ts 的映射表提取保持同构：顶层 `  key: 'value',` 两条锚
# （SYMBOL_TO_MC_LITERAL 字面量表 + satisfies，key 联合推导依赖该字面量形态）
MAPPED_RE = re.compile(r"^\s{2}([a-z_0-9]+):\s*'[^']+',?\s*(?://.*)?$", re.M)
LITERAL_RES = [
    re.compile(r'\bsymbol="([a-z_0-9]+)"'),
    re.compile(r"\bsymbol:\s*'([a-z_0-9]+)'"),
    re.compile(r"\bsymbolToMc\('([a-z_0-9]+)'\)"),
]


def is_test_path(p: Path) -> bool:
    return '.test.' in p.name or '__tests__' in p.parts or 'src/test/' in str(p).replace('\\', '/')


def mapped_names() -> set[str]:
    text = MAPPING_FILE.read_text(encoding='utf-8')
    return set(MAPPED_RE.findall(text))


def scan() -> list[dict]:
    mapped = mapped_names()
    hits = []
    for d in SCAN_ROOTS:
        if not d.exists():
            continue
        for fp in sorted(d.rglob('*')):
            if fp.suffix not in ('.ts', '.tsx') or is_test_path(fp):
                continue
            text = fp.read_text(encoding='utf-8')
            rel = str(fp.relative_to(ROOT))
            for sym in set().union(*(rx.findall(text) for rx in LITERAL_RES)):
                if sym not in mapped:
                    # P2-1（批3审查）：行号定位正则须覆盖三形态（JSX symbol="x" /
                    # 对象 symbol: 'x' / 直调 symbolToMc('x')），与 LITERAL_RES 口径
                    # 一致；否则对象字段形态的命中会走 break 前的 finditer 落空、
                    # 丢 文件:行 定位（审计时该样例被定位到兜底行）
                    for m in re.finditer(rf'\bsymbol="?{sym}"?|\bsymbol:\s*\'?{sym}\'?|symbolToMc\(\'{sym}\'\)', text):
                        line = text[: m.start()].count('\n') + 1
                        hits.append({'file': rel, 'line': line, 'symbol': sym})
                        break  # 同文件同 symbol 记首处即可（对账键 文件::symbol）
    return hits


def hit_key(h: dict) -> str:
    # 行号随编辑漂移，对账键取 文件::symbol（同文件同 symbol 多处共享一条记账）
    return f"{h['file']}::{h['symbol']}"


def run_check() -> int:
    if not MAPPING_FILE.exists():
        print(f'❌ 映射表不存在: {MAPPING_FILE}', file=sys.stderr)
        sys.exit(2)
    if not BASELINE.exists():
        print(f'❌ 基线文件不存在: {BASELINE}（首次生成：--dump-baseline > 该路径）', file=sys.stderr)
        sys.exit(2)
    baseline = json.loads(BASELINE.read_text(encoding='utf-8'))
    known = {e['key'] for e in baseline['entries']}
    hits = scan()
    mapped = mapped_names()
    new = [h for h in hits if hit_key(h) not in known]
    stale = [e for e in baseline['entries'] if e['key'] not in {hit_key(h) for h in hits}]
    print(f"[icon-symbol] 映射表 {len(mapped)} key，扫描命中缺映射 {len(hits)} 处"
          f"（基线 {len(known)} 个 文件:symbol 记账项）")
    if stale:
        print('\nℹ️  基线内 {n} 项已补映射或删除（记得同步删基线，仅提示不拦）：'.format(n=len(stale)))
        for e in stale[:10]:
            print(f"  - {e['key']}（{e.get('reason', '')}）")
    if new:
        print('\n❌ 新增未映射 symbol {n} 处（基线外，运行时会静默兜底 circle-outline）：'.format(n=len(new)))
        for h in new[:30]:
            print(f"  {h['file']}:{h['line']}  symbol={h['symbol']}")
        if len(new) > 30:
            print(f'  … 其余 {len(new) - 30} 处省略')
        print("\n处置：在 src/theme/iconMapping.ts 加映射（正向修法，MC 无对应时选近语义图标并注释）；"
              "\n确属临时豁免才入 scripts/gate/icon-symbol-baseline.json（带 reason）")
        return 1
    print('✅ 无基线外新增缺映射 symbol')
    return 0


def self_test() -> int:
    """构造样例自验 Q6 exit 语义：无命中 exit 0 / 新增缺映射 exit 1 / 基线内记账 exit 0。"""
    import subprocess

    fake_root = Path(tempfile.mkdtemp(prefix='icon-symbol-selftest-'))
    (fake_root / 'apps' / 'client-app' / 'app' / 'demo').mkdir(parents=True)
    (fake_root / 'apps' / 'client-app' / 'src' / 'theme').mkdir(parents=True)
    # 最小映射表（同真表字面量形态：两空格缩进 + 引号值）
    (fake_root / 'apps' / 'client-app' / 'src' / 'theme' / 'iconMapping.ts').write_text(
        "const SYMBOL_TO_MC_LITERAL = {\n  shopping_cart: 'cart',\n} satisfies Readonly<Record<string, IconName>>;\n",
        encoding='utf-8')
    # 基线（空）
    base_file = fake_root / 'scripts' / 'gate' / 'icon-symbol-baseline.json'
    base_file.parent.mkdir(parents=True)
    base_file.write_text(json.dumps({'entries': []}, ensure_ascii=False), encoding='utf-8')

    # 样例 1：已映射 symbol → exit 0
    (fake_root / 'apps' / 'client-app' / 'app' / 'demo' / 'ok.tsx').write_text(
        "<Icon symbol=\"shopping_cart\" />\n", encoding='utf-8')
    r1 = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--fake-root', str(fake_root)],
                        capture_output=True, text=True)
    # 样例 2：新增未映射 symbol（JSX + 对象字段 + 直调三形态）→ exit 1 且列明
    (fake_root / 'apps' / 'client-app' / 'app' / 'demo' / 'bad.tsx').write_text(
        "<Icon symbol=\"ghost_icon\" />\nconst s = { symbol: 'ghost_icon' };\nsymbolToMc('ghost_two');\n",
        encoding='utf-8')
    r2 = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--fake-root', str(fake_root)],
                        capture_output=True, text=True)
    # 样例 3：缺映射入基线记账 → 回到 exit 0
    base_file.write_text(json.dumps(
        {'entries': [{'key': 'apps/client-app/app/demo/bad.tsx::ghost_icon', 'reason': '自测'},
                     {'key': 'apps/client-app/app/demo/bad.tsx::ghost_two', 'reason': '自测'}]},
        ensure_ascii=False), encoding='utf-8')
    r3 = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--fake-root', str(fake_root)],
                        capture_output=True, text=True)

    ok = (r1.returncode == 0 and r2.returncode != 0
          and 'ghost_icon' in r2.stdout and 'bad.tsx' in r2.stdout
          and r3.returncode == 0)
    print(f'  已映射命中 exit 0 …… {"✅" if r1.returncode == 0 else "❌ " + r1.stdout}')
    print(f'  新增缺映射 exit 1 + 列明位置 …… '
          f'{"✅" if r2.returncode != 0 and "ghost_icon" in r2.stdout and "bad.tsx" in r2.stdout else "❌ " + r2.stdout}')
    print(f'  基线记账后回到 exit 0 …… {"✅" if r3.returncode == 0 else "❌ " + r3.stdout}')
    if not ok:
        return 1
    print('✅ self-test 通过')
    return 0


def main() -> None:
    ap = argparse.ArgumentParser(description='icon symbol 映射门禁（Q6：存量记账 / 新增拦截）')
    ap.add_argument('--self-test', action='store_true', help='构造样例自验 exit 语义')
    ap.add_argument('--dump-baseline', action='store_true', help='输出当前命中 JSON（生成基线用）')
    ap.add_argument('--fake-root', help='（self-test 内部用）替代仓根的假目录')
    args = ap.parse_args()
    global ROOT, CLIENT, MAPPING_FILE, BASELINE, SCAN_ROOTS
    if args.fake_root:
        ROOT = Path(args.fake_root)
        CLIENT = ROOT / 'apps' / 'client-app'
        MAPPING_FILE = CLIENT / 'src' / 'theme' / 'iconMapping.ts'
        BASELINE = ROOT / 'scripts' / 'gate' / 'icon-symbol-baseline.json'
        SCAN_ROOTS = [CLIENT / 'app', CLIENT / 'src']
    if args.self_test:
        sys.exit(self_test())
    if args.dump_baseline:
        hits = scan()
        entries = [{'key': hit_key(h), 'reason': '存量（批3 基线建立时点命中）'} for h in hits]
        print(json.dumps({'entries': entries}, ensure_ascii=False, indent=2))
        return
    sys.exit(run_check())


if __name__ == '__main__':
    main()
