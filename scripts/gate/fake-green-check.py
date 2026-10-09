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

# N-P2-1（批2）：两端 src + 两端 app 页面层测试（app/__tests__ 等）一并纳入
SCAN_ROOTS = [
    ROOT / 'apps' / 'client-app' / 'src',
    ROOT / 'apps' / 'rider-app' / 'src',
    ROOT / 'apps' / 'client-app' / 'app',
    ROOT / 'apps' / 'rider-app' / 'app',
]

# it/test('标题', ...) 完整捕获到匹配闭括号前的用例体
IT_RE = re.compile(r"""\b(?:it|test)\s*\(\s*(['"`])(.+?)\1\s*,""")
# 用例名的失败语义词（中英）
FAIL_HINT_RE = re.compile(
    r'(error|fail|404|500|异常|失败|拒绝|无效|未实现|不存在|非法|超限|过期| invalid |invalid\b|reject)', re.IGNORECASE)
# 断言清单（用例体内逐行）
ASSERT_RE = re.compile(r'expect\s*\(')
# 弱断言匹配器（N-P2-2 批2：从「仅 toBeTruthy」扩为「弱断言占比」口径）
WEAK_MATCHERS = {'toBeTruthy', 'toBeDefined'}
# 弱断言占比阈值：失败语义用例中弱断言 ≥60% 即判假绿（纯 toBeTruthy 是 100%，自然覆盖旧口径）
WEAK_RATIO = 0.6


def extract_matchers(body: str) -> list[str]:
    """从用例体提取 expect(...) 链尾匹配器。

    N-P2-2 加固：expect( 与 ) 跨行（render 多行参数/换行链式）旧单行正则漏检，
    改为括号深度扫描（带字符串字面量感知），expect 的 close paren 后接 .matcher。
    """
    matchers: list[str] = []
    for m in ASSERT_RE.finditer(body):
        i = m.end()
        depth = 1
        quote: str | None = None
        while i < len(body) and depth:
            c = body[i]
            if quote:
                if c == '\\':
                    i += 2
                    continue
                if c == quote:
                    quote = None
            elif c in ('"', "'", '`'):
                quote = c
            elif c in '([{':
                depth += 1
            elif c in ')]}':
                depth -= 1
            i += 1
        mm = re.match(r'\s*\.\s*(\w+)', body[i:])
        if mm:
            matchers.append(mm.group(1))
    return matchers


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
                matchers = extract_matchers(body)
                if not matchers:
                    continue
                weak = [x for x in matchers if x in WEAK_MATCHERS]
                # N-P2-2：弱断言占比 ≥ WEAK_RATIO（纯 toBeTruthy=100% 自然命中）
                if len(weak) / len(matchers) >= WEAK_RATIO:
                    line = start_line + 1
                    hits.append({'file': rel, 'line': line,
                                 'title': title[:60], 'assertions': len(weak),
                                 'total': len(matchers)})
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
    print(f'[fake-green] 扫描两端测试文件，失败语义用例中弱断言占比 ≥{int(WEAK_RATIO * 100)}%'
          f'命中 {len(hits)} 处（基线 {len(known)} 项）')
    if stale:
        print(f'\nℹ️  基线内 {len(stale)} 项已无命中（修好了记得同步删基线，仅提示不拦）：')
        for e in stale[:10]:
            print(f"  - {e['key']}")
    if new:
        print(f'\n❌ 新增假绿 {len(new)} 处（失败语义用例弱断言占比过高，基线外拦截）：')
        for h in new[:30]:
            print(f"  {h['file']}:{h['line']}  it('{h['title']}'…) — 弱断言 {h['assertions']}/{h['total']}")
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
    # N-P2-1 批2：SCAN_ROOTS 已扩到 apps/*/app——self-test 样例覆盖 app 根测试文件
    (fake_root / 'apps' / 'client-app' / 'src').mkdir(parents=True)
    (fake_root / 'apps' / 'client-app' / 'app' / '__tests__').mkdir(parents=True)
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
    # 新增样例 1：基线外同款假绿（src 根）
    (fake_root / 'apps' / 'client-app' / 'src' / 'new.test.ts').write_text(
        "it('404 fails gracefully', () => {\n"
        "  render(<Y />);\n"
        "  expect(screen.getByText('oops')).toBeTruthy();\n"
        "});\n",
        encoding='utf-8')
    r2 = run()
    # 新增样例 2：app 根测试文件（app/__tests__）同款假绿——证明扩根拦截生效
    (fake_root / 'apps' / 'client-app' / 'app' / '__tests__' / 'page.test.tsx').write_text(
        "it('500 error page renders', () => {\n"
        "  render(<Z />);\n"
        "  expect(screen.getByText('boom')).toBeTruthy();\n"
        "});\n",
        encoding='utf-8')
    r3 = run()

    ok1 = r1.returncode == 0
    ok2 = r2.returncode != 0 and '404 fails gracefully' in r2.stdout
    ok3 = r3.returncode != 0 and '500 error page renders' in r3.stdout \
        and 'page.test.tsx' in r3.stdout
    print(f'  存量命中 exit 0 …… {"✅" if ok1 else "❌ " + r1.stdout}')
    print(f'  新增假绿 exit 非零 …… {"✅" if ok2 else "❌ " + r2.stdout}')
    print(f'  新增列明位置 …… {"✅" if "404 fails gracefully" in r2.stdout else "❌"}')
    print(f'  app 根新增假绿拦截 …… {"✅" if ok3 else "❌ " + r3.stdout}')
    if not (ok1 and ok2 and ok3):
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
        SCAN_ROOTS = [
            ROOT / 'apps' / 'client-app' / 'src',
            ROOT / 'apps' / 'rider-app' / 'src',
            ROOT / 'apps' / 'client-app' / 'app',
            ROOT / 'apps' / 'rider-app' / 'app',
        ]
    if args.self_test:
        sys.exit(self_test())
    sys.exit(run_check())


if __name__ == '__main__':
    main()
