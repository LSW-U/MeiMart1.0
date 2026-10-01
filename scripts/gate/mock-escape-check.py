#!/usr/bin/env python3
"""
mock 逃逸门禁（跨端批5 B5，Q6 语义：存量记账不拦截 / 新增拦截）

扫描两端 src（不含测试文件）的 mock 逃逸占位：
  - FORCE_MOCK        ：real 模式强制走 mock 的硬编码开关（earnings.ts D9 治理先例）
  - pay-mock          ：后端模拟支付端点（无真实资金流，real 模式须守卫拦截）
  - 恒mock / 恒 mock  ：注释/标识里的「恒久 mock」语义占位
  - mockDb            ：client mock 数据库直返（mockDb.ts 定义文件自身豁免）

Q6 拍板（总指挥）：存量命中与基线 scripts/gate/mock-escape-baseline.json 对账——
  - 命中全部在基线内 → 输出计数记账，exit 0（不拦截存量，避免一次清洗 130+ 处）
  - 出现基线外新增命中 → exit 1 列明 文件:行:模式（新增逃逸必须当场给豁免理由入基线或修掉）

用法：
  python3 scripts/gate/mock-escape-check.py            # 正式扫描（对账基线）
  python3 scripts/gate/mock-escape-check.py --self-test # 构造样例自验 exit 语义
"""
import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent  # 仓根（scripts/gate/ 上两级）
BASELINE = Path(__file__).resolve().parent / 'mock-escape-baseline.json'

# 扫描目标：两端 src（测试文件豁免——测试里的 mock 语义不是运行时逃逸）
SCAN_ROOTS = [ROOT / 'apps' / 'client-app' / 'src', ROOT / 'apps' / 'rider-app' / 'src']
# mockDb 定义文件自身豁免（定义≠逃逸）
EXEMPT_FILES = {'mockDb.ts'}

PATTERNS = [
    ('FORCE_MOCK', re.compile(r'\bFORCE_MOCK\b')),
    ('pay-mock', re.compile(r'\bpay-mock\b')),
    ('恒mock', re.compile(r'恒\s*mock', re.IGNORECASE)),
    ('mockDb', re.compile(r'\bmockDb\b')),
]


def is_test_path(p: Path) -> bool:
    return '.test.' in p.name or '__tests__' in p.parts or 'src/test/' in str(p).replace('\\', '/')


def scan() -> list[dict]:
    hits = []
    for d in SCAN_ROOTS:
        if not d.exists():
            continue
        for fp in sorted(d.rglob('*')):
            if fp.suffix not in ('.ts', '.tsx') or is_test_path(fp):
                continue
            if fp.name in EXEMPT_FILES:
                continue
            text = fp.read_text(encoding='utf-8')
            rel = str(fp.relative_to(ROOT))
            for name, rx in PATTERNS:
                for m in rx.finditer(text):
                    line = text[: m.start()].count('\n') + 1
                    hits.append({'file': rel, 'line': line, 'pattern': name})
    return hits


def hit_key(h: dict) -> str:
    # 行号会随编辑漂移，基线对账键取 文件:模式（行号仅展示用）——
    # 同文件同模式多处命中共享一条基线记录（reason 按文件级声明）
    return f"{h['file']}::{h['pattern']}"


def run_check() -> int:
    baseline_path = ROOT / 'scripts' / 'gate' / 'mock-escape-baseline.json'
    if not baseline_path.exists():
        print(f'❌ 基线文件不存在: {baseline_path}', file=sys.stderr)
        sys.exit(2)
    baseline = json.loads(baseline_path.read_text(encoding='utf-8'))
    known = {e['key'] for e in baseline['entries']}
    hits = scan()
    new = [h for h in hits if hit_key(h) not in known]
    stale = [e for e in baseline['entries'] if e['key'] not in {hit_key(h) for h in hits}]
    print(f'[mock-escape] 扫描 {len(SCAN_ROOTS)} 个 src 根，命中 {len(hits)} 处'
          f'（基线 {len(known)} 个 文件:模式 记账项）')
    by_pattern: dict[str, int] = {}
    for h in hits:
        by_pattern[h['pattern']] = by_pattern.get(h['pattern'], 0) + 1
    for name, n in sorted(by_pattern.items()):
        print(f"  - {name}: {n} 处（存量记账，exit 0）")
    if stale:
        print(f'\nℹ️  基线内 {len(stale)} 项已无命中（逃逸清除了记得同步删基线，仅提示不拦）：')
        for e in stale[:10]:
            print(f"  - {e['key']}（{e.get('reason', '')}）")
    if new:
        print(f'\n❌ 新增 mock 逃逸 {len(new)} 处（基线外，Q6 新增拦截）：')
        for h in new[:30]:
            print(f"  {h['file']}:{h['line']}  [{h['pattern']}]")
        if len(new) > 30:
            print(f'  … 其余 {len(new) - 30} 处省略')
        print('\n处置：修掉，或带豁免理由加入 scripts/gate/mock-escape-baseline.json')
        return 1
    print('✅ 无基线外新增逃逸')
    return 0


def self_test() -> int:
    """构造样例自验 Q6 exit 语义：存量命中 exit 0 / 新增违规 exit 非零。"""
    import subprocess

    fake_root = Path(tempfile.mkdtemp(prefix='mock-escape-selftest-'))
    (fake_root / 'apps' / 'client-app' / 'src' / 'services').mkdir(parents=True)
    baseline = {'entries': [{'key': 'apps/client-app/src/services/ok.ts::FORCE_MOCK',
                             'reason': '自测存量样例'}]}
    # 基线写到假仓根的 scripts/gate/（--fake-root 模式下 BASELINE 随 ROOT 重解析）
    base_file = fake_root / 'scripts' / 'gate' / 'mock-escape-baseline.json'
    base_file.parent.mkdir(parents=True)
    base_file.write_text(json.dumps(baseline, ensure_ascii=False), encoding='utf-8')

    # 样例 1：存量命中（基线内）→ 应 exit 0
    (fake_root / 'apps' / 'client-app' / 'src' / 'services' / 'ok.ts').write_text(
        'const FORCE_MOCK = true;\n', encoding='utf-8')
    r1 = subprocess.run(
        [sys.executable, str(Path(__file__).resolve()), '--fake-root', str(fake_root)],
        capture_output=True, text=True)
    # 样例 2：新增违规（基线外 pay-mock）→ 应 exit 非零
    (fake_root / 'apps' / 'client-app' / 'src' / 'services' / 'bad.ts').write_text(
        "const p = '/pay-mock';\n", encoding='utf-8')
    r2 = subprocess.run(
        [sys.executable, str(Path(__file__).resolve()), '--fake-root', str(fake_root)],
        capture_output=True, text=True)

    ok = r1.returncode == 0 and r2.returncode != 0 and 'pay-mock' in r2.stdout
    print(f'  存量命中 exit 0 …… {"✅" if r1.returncode == 0 else "❌ " + r1.stdout}')
    print(f'  新增违规 exit 非零 …… {"✅" if r2.returncode != 0 else "❌ " + r2.stdout}')
    print(f'  新增列明位置 …… {"✅" if "pay-mock" in r2.stdout else "❌"}')
    if not ok:
        return 1
    print('✅ self-test 通过')
    return 0


def main() -> None:
    ap = argparse.ArgumentParser(description='mock 逃逸门禁（Q6：存量记账 / 新增拦截）')
    ap.add_argument('--self-test', action='store_true', help='构造样例自验 exit 语义')
    ap.add_argument('--fake-root', help='（self-test 内部用）替代仓根的假目录')
    args = ap.parse_args()
    if args.self_test:
        sys.exit(self_test())
    global ROOT, SCAN_ROOTS
    if args.fake_root:
        ROOT = Path(args.fake_root)
        SCAN_ROOTS = [ROOT / 'apps' / 'client-app' / 'src', ROOT / 'apps' / 'rider-app' / 'src']
    sys.exit(run_check())


if __name__ == '__main__':
    main()
