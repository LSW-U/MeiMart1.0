#!/usr/bin/env python3
"""
假绿门禁（跨端批5 B3，Q6 语义：存量记账不拦截 / 新增拦截）

静态识别「用例名声称失败路径、断言却只 toBeTruthy」类假绿模式：
  - 用例名（it/test 标题）含 error/fail/404/500/未实现/拒绝/无效 等失败语义词，
    而用例体内唯一断言是 toBeTruthy()——失败路径渲染了任何东西都绿，等于没测。

参照审查报告 §7 实例：CaptchaInput expireIn 固定 60、sign.test.tsx 仅 toBeTruthy。

Q6 拍板（总指挥）：存量命中与基线 scripts/gate/fake-green-baseline.json 对账——
  - 命中全部在基线内 → 输出计数记账，exit 0（不拦截存量，存量清洗另行立项）
  - 基线外新增 → exit 1 列明 文件:行（新增假绿当场修或入基线带理由）

用法：
  python3 scripts/gate/fake-green-check.py             # 正式扫描（对账基线）
  python3 scripts/gate/fake-green-check.py --self-test # 构造样例自验 exit 语义
"""
import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent  # 仓根

SCAN_ROOTS = [ROOT / 'apps' / 'client-app' / 'src', ROOT / 'apps' / 'rider-app' / 'src']

# it/test('标题', ...) 完整捕获到匹配闭括号前的用例体
IT_RE = re.compile(r"""\b(?:it|test)\s*\(\s*(['"`])(.+?)\1\s*,""")
# 用例名的失败语义词（中英）
FAIL_HINT_RE = re.compile(
    r'(error|fail|404|500|异常|失败|拒绝|无效|未实现|不存在|非法|超限|过期| invalid |invalid\b|reject)', re.IGNORECASE)
# 断言清单（用例体内逐行）
ASSERT_RE = re.compile(r'expect\s*\(')
# 「唯一断言是 toBeTruthy」= 所有断言行里 toBeTruthy 覆盖全部、无其他匹配器
MATCHER_RE = re.compile(r"expect\s*\(.*?\)\s*\.\s*(\w+)")
TRUTHY_ONLY = {'toBeTruthy'}


def scan() -> list[dict]:
    hits = []
    for d in SCAN_ROOTS:
        if not d.exists():
            continue
        for fp in sorted(d.rglob('*')):
            if fp.suffix not in ('.ts', '.tsx') or '.test.' not in fp.name:
                continue
            text = fp.read_text(encoding='utf-8')
            rel = str(fp.relative_to(ROOT))
            lines = text.split('\n')
            for m in IT_RE.finditer(text):
                title = m.group(2)
                if not FAIL_HINT_RE.search(title):
                    continue
                # 用例体：从 it( 行到下一个 it(/test(/describe( 或文件尾
                start_line = text[: m.start()].count('\n')
                rest = '\n'.join(lines[start_line + 1:])
                nxt = re.search(r"\b(?:it|test|describe)\s*\(", rest)
                body = rest[: nxt.start()] if nxt else rest
                matchers = MATCHER_RE.findall(body)
                if matchers and set(matchers) <= TRUTHY_ONLY:
                    line = start_line + 1
                    hits.append({'file': rel, 'line': line,
                                 'title': title[:60], 'assertions': len(matchers)})
    return hits


def run_check() -> int:
    baseline_path = ROOT / 'scripts' / 'gate' / 'fake-green-baseline.json'
    if not baseline_path.exists():
        print(f'❌ 基线文件不存在: {baseline_path}', file=sys.stderr)
        sys.exit(2)
    baseline = json.loads(baseline_path.read_text(encoding='utf-8'))
    known = {e['key'] for e in baseline['entries']}
    hits = scan()
    # 键=文件::用例行号锚定标题前缀（行号漂移容忍：标题前 24 字符做指纹）
    def key(h):
        return f"{h['file']}::{h['title'][:24]}"
    new = [h for h in hits if key(h) not in known]
    hit_keys = {key(h) for h in hits}
    stale = [e for e in baseline['entries'] if e['key'] not in hit_keys]
    print(f'[fake-green] 扫描两端测试文件，失败语义用例中「仅 toBeTruthy」命中 {len(hits)} 处'
          f'（基线 {len(known)} 项）')
    if stale:
        print(f'\nℹ️  基线内 {len(stale)} 项已无命中（修好了记得同步删基线，仅提示不拦）：')
        for e in stale[:10]:
            print(f"  - {e['key']}")
    if new:
        print(f'\n❌ 新增假绿 {len(new)} 处（失败语义用例仅 toBeTruthy 断言，基线外拦截）：')
        for h in new[:30]:
            print(f"  {h['file']}:{h['line']}  it('{h['title']}'…) — {h['assertions']} 个 toBeTruthy")
        if len(new) > 30:
            print(f'  … 其余 {len(new) - 30} 处省略')
        print('\n处置：补强断言（断言错误文案/错误码/状态翻转为负向），或带理由入基线')
        return 1
    print('✅ 无基线外新增假绿')
    return 0


def self_test() -> int:
    """构造样例自验：存量命中 exit 0 / 新增假绿 exit 非零。"""
    import subprocess

    fake_root = Path(tempfile.mkdtemp(prefix='fake-green-selftest-'))
    (fake_root / 'apps' / 'client-app' / 'src').mkdir(parents=True)
    # 存量样例：失败语义 + 仅 toBeTruthy（基线内）
    (fake_root / 'apps' / 'client-app' / 'src' / 'old.test.ts').write_text(
        "it('shows error state', () => {\n"
        "  render(<X />);\n"
        "  expect(screen.getByText('err')).toBeTruthy();\n"
        "});\n",
        encoding='utf-8')
    baseline = {'entries': [{'key': 'apps/client-app/src/old.test.ts::shows error state',
                             'reason': '自测存量样例'}]}
    base_file = fake_root / 'scripts' / 'gate' / 'fake-green-baseline.json'
    base_file.parent.mkdir(parents=True)
    base_file.write_text(json.dumps(baseline, ensure_ascii=False), encoding='utf-8')

    run = lambda: subprocess.run(
        [sys.executable, str(Path(__file__).resolve()), '--fake-root', str(fake_root)],
        capture_output=True, text=True)
    r1 = run()
    # 新增样例：基线外同款假绿
    (fake_root / 'apps' / 'client-app' / 'src' / 'new.test.ts').write_text(
        "it('404 fails gracefully', () => {\n"
        "  render(<Y />);\n"
        "  expect(screen.getByText('oops')).toBeTruthy();\n"
        "});\n",
        encoding='utf-8')
    r2 = run()

    ok1 = r1.returncode == 0
    ok2 = r2.returncode != 0 and '404 fails gracefully' in r2.stdout
    print(f'  存量命中 exit 0 …… {"✅" if ok1 else "❌ " + r1.stdout}')
    print(f'  新增假绿 exit 非零 …… {"✅" if r2.returncode != 0 else "❌ " + r2.stdout}')
    print(f'  新增列明位置 …… {"✅" if "404 fails gracefully" in r2.stdout else "❌"}')
    if not (ok1 and ok2):
        return 1
    print('✅ self-test 通过')
    return 0


def main() -> None:
    ap = argparse.ArgumentParser(description='假绿门禁（Q6：存量记账 / 新增拦截）')
    ap.add_argument('--self-test', action='store_true', help='构造样例自验 exit 语义')
    ap.add_argument('--fake-root', help='（self-test 内部用）替代仓根的假目录')
    args = ap.parse_args()
    global ROOT, SCAN_ROOTS
    if args.fake_root:
        ROOT = Path(args.fake_root)
        SCAN_ROOTS = [ROOT / 'apps' / 'client-app' / 'src', ROOT / 'apps' / 'rider-app' / 'src']
    if args.self_test:
        sys.exit(self_test())
    sys.exit(run_check())


if __name__ == '__main__':
    main()
