#!/usr/bin/env python3
"""
死 i18n key 门禁（数据层工程治理 批3 D9/V3-3，Q6 语义：存量记账不拦截 / 新增拦截）

背景：审查批1 发现 profile.tickets 在 locales 四语都有、但 check-i18n-keys.py 的
t() 存在性扫描不报——因为 key 是经 labelKey 间接引用形态走的（本仓存在大量
labelKey/titleKey/descKey… 运行时才喂给 t() 的配置驱动形态）。本 gate 把
「locales key 与代码引用差集」纳入门禁，补此盲区。

扫描口径：
  - key 集合：locales/en.json 扁平化（对齐 check-i18n-keys.py 基线 locale 口径）
  - 引用集合（client-app app/ + src/ 非测试文件）：
      t('ns.key') / t("ns.key")            —— 直接调用
      labelKey: 'ns.key' 等 *Key 配置字段   —— 间接引用（labelKey/titleKey/descKey/
                                             ctaKey/bodyKey/badgeTextKey/bannerLabelKey/
                                             bannerValueKey）
      i18n.t('ns.key')                      —— 命令式调用（与 t() 同前缀正则覆盖）
  - 动态拼接（t(`ns.${x}`)）：无法静态判定，取其字面前缀 ns. 作为「动态前缀」，
    凡 key 落在任一动态前缀下的视为可能被引用（宽松放行，不进死 key 判定）

对账基线 scripts/gate/dead-i18n-key-baseline.json：
  - 死 key 全部在基线内 → 记账 exit 0
  - 新死 key（基线外）→ exit 1 列明
  - 提示「删 key 与删引用须原子 commit」（i18n 门禁先例：删 key 与删引用分 commit 会互打）

用法：
  python3 scripts/gate/dead-i18n-key-check.py                 # 正式扫描（对账基线）
  python3 scripts/gate/dead-i18n-key-check.py --dump-baseline # 输出当前死 key（生成基线用）
  python3 scripts/gate/dead-i18n-key-check.py --self-test      # 构造样例自验 exit 语义
"""
import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent  # 仓根
BASELINE = Path(__file__).resolve().parent / 'dead-i18n-key-baseline.json'
CLIENT = ROOT / 'apps' / 'client-app'
EN_JSON = CLIENT / 'locales' / 'en.json'

SCAN_ROOTS = [CLIENT / 'app', CLIENT / 'src']

# 直接调用形态：t('key') / t("key") / i18n.t('key')（不含模板串反引号——动态前缀单独收）
T_LITERAL_RE = re.compile(r"\bt\(\s*['\"]([a-zA-Z0-9_.]+)['\"]")
# 间接引用形态：*Key: 'ns.key'（配置驱动，运行时才喂 t()——profile.tickets 盲区即此形态）
KEY_FIELD_RE = re.compile(
    r"(?:labelKey|titleKey|descKey|ctaKey|bodyKey|badgeTextKey|bannerLabelKey|bannerValueKey)"
    r":\s*'([a-zA-Z0-9_.]+)'")
# 动态拼接：t(`ns.${...}`) —— 收字面前缀
T_DYNAMIC_RE = re.compile(r"\bt\(\s*`([a-zA-Z0-9_.]+?)\$\{")
# mock 数据里的间接引用（promotions.json titleKey 等）：mock JSON 也是运行时引用源
MOCK_KEY_RE = re.compile(
    r'"(?:labelKey|titleKey|descKey|ctaKey|bodyKey|badgeTextKey|bannerLabelKey|bannerValueKey)"'
    r':\s*"([a-zA-Z0-9_.]+)"')
MOCK_ROOT = CLIENT / 'mocks' / 'data'


def is_test_path(p: Path) -> bool:
    return '.test.' in p.name or '__tests__' in p.parts or 'src/test/' in str(p).replace('\\', '/')


def flatten(o, prefix=''):
    for k, v in o.items():
        if isinstance(v, dict):
            yield from flatten(v, prefix + k + '.')
        else:
            yield prefix + k


def locale_keys() -> set[str]:
    return set(flatten(json.loads(EN_JSON.read_text(encoding='utf-8'))))


def code_refs() -> tuple[set[str], set[str]]:
    """返回（静态引用 key 集, 动态前缀集）"""
    refs: set[str] = set()
    dyn_prefixes: set[str] = set()
    for d in SCAN_ROOTS:
        if not d.exists():
            continue
        for fp in sorted(d.rglob('*')):
            if fp.suffix not in ('.ts', '.tsx') or is_test_path(fp):
                continue
            text = fp.read_text(encoding='utf-8')
            refs |= set(T_LITERAL_RE.findall(text))
            refs |= set(KEY_FIELD_RE.findall(text))
            dyn_prefixes |= set(T_DYNAMIC_RE.findall(text))
    # mock 数据 JSON 是运行时引用源（promotions.json titleKey → PromoDock t() 渲染）
    if MOCK_ROOT.exists():
        for fp in sorted(MOCK_ROOT.rglob('*.json')):
            refs |= set(MOCK_KEY_RE.findall(fp.read_text(encoding='utf-8')))
    return refs, dyn_prefixes


def dead_keys() -> set[str]:
    keys = locale_keys()
    refs, dyn_prefixes = code_refs()
    return {
        k for k in keys
        if k not in refs and not any(k.startswith(p) for p in dyn_prefixes)
    }


def key_of(k: str) -> str:
    return k  # 死 key 本身即对账键（key 名不随行号漂移）


def run_check() -> int:
    if not EN_JSON.exists():
        print(f'❌ locale 基线不存在: {EN_JSON}', file=sys.stderr)
        sys.exit(2)
    if not BASELINE.exists():
        print(f'❌ 基线文件不存在: {BASELINE}（首次生成：--dump-baseline > 该路径）', file=sys.stderr)
        sys.exit(2)
    baseline = json.loads(BASELINE.read_text(encoding='utf-8'))
    known = {e['key'] for e in baseline['entries']}
    dead = dead_keys()
    keys = locale_keys()
    new = sorted(dead - known)
    stale = sorted(e['key'] for e in baseline['entries'] if e['key'] not in dead)
    print(f'[dead-i18n-key] locales {len(keys)} key，判定死 key {len(dead)} 个'
          f'（基线 {len(known)} 个记账项）')
    if stale:
        print(f'\nℹ️  基线内 {len(stale)} 个 key 已恢复引用（记得同步删基线，仅提示不拦）：')
        for k in stale[:10]:
            print(f'  - {k}')
    if new:
        print(f'\n❌ 新增死 key {len(new)} 个（locales 有、代码零引用，基线外）：')
        for k in new[:30]:
            print(f'  - {k}')
        if len(new) > 30:
            print(f'  … 其余 {len(new) - 30} 个省略')
        print('\n⚠️  删 key 与删引用须原子 commit（分 commit 会互打 i18n 门禁/本门禁）；'
              '\n若 key 仍在过渡期（如待接页面），带 reason 入 '
              'scripts/gate/dead-i18n-key-baseline.json')
        return 1
    print('✅ 无基线外新增死 key')
    return 0


def self_test() -> int:
    """构造样例自验 Q6 exit 语义：无死 key exit 0 / 新死 key exit 1 / 入基线记账 exit 0。"""
    import subprocess

    fake_root = Path(tempfile.mkdtemp(prefix='dead-i18n-key-selftest-'))
    (fake_root / 'apps' / 'client-app' / 'app' / 'demo').mkdir(parents=True)
    (fake_root / 'apps' / 'client-app' / 'locales').mkdir(parents=True)
    (fake_root / 'apps' / 'client-app' / 'locales' / 'en.json').write_text(json.dumps({
        'profile': {'tickets': 'My Tickets', 'used': 'Used'},
        'demo': {'live': 'Live', 'dynamic': 'Dyn'},
    }), encoding='utf-8')
    # 基线（空）
    base_file = fake_root / 'scripts' / 'gate' / 'dead-i18n-key-baseline.json'
    base_file.parent.mkdir(parents=True)
    base_file.write_text(json.dumps({'entries': []}, ensure_ascii=False), encoding='utf-8')

    # 样例 1：live/used 被 t() 引用、dynamic 落动态前缀 → 死 key 仅 profile.tickets（已入基线）→ exit 0
    (fake_root / 'apps' / 'client-app' / 'app' / 'demo' / 'ok.tsx').write_text(
        "const a = t('demo.live');\nconst b = t('profile.used');\nconst c = t(`demo.${x}`);\n",
        encoding='utf-8')
    base_file.write_text(json.dumps(
        {'entries': [{'key': 'profile.tickets', 'reason': '自测：labelKey 间接引用形态前先记账'}]},
        ensure_ascii=False), encoding='utf-8')
    r1 = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--fake-root', str(fake_root)],
                        capture_output=True, text=True)
    # 样例 2：labelKey 间接引用救回 profile.tickets + 出现新死 key demo.dynamic → exit 1 列明
    (fake_root / 'apps' / 'client-app' / 'app' / 'demo' / 'tickets.ts').write_text(
        "const item = { labelKey: 'profile.tickets' };\n", encoding='utf-8')
    (fake_root / 'apps' / 'client-app' / 'locales' / 'en.json').write_text(json.dumps({
        'profile': {'tickets': 'My Tickets', 'used': 'Used'},
        'demo': {'live': 'Live', 'dynamic': 'Dyn'},
        'orphan': {'nested': 'Nobody refs me'},
    }), encoding='utf-8')
    r2 = subprocess.run([sys.executable, str(Path(__file__).resolve()), '--fake-root', str(fake_root)],
                        capture_output=True, text=True)

    ok = (r1.returncode == 0 and r2.returncode != 0
          and 'orphan.nested' in r2.stdout
          and 'profile.tickets' not in r2.stdout.split('❌')[-1] if '❌' in r2.stdout else True)
    print(f'  存量记账 exit 0（动态前缀放行）…… {"✅" if r1.returncode == 0 else "❌ " + r1.stdout}')
    print(f'  labelKey 引用救回 + 新死 key exit 1 …… '
          f'{"✅" if r2.returncode != 0 and "orphan.nested" in r2.stdout else "❌ " + r2.stdout}')
    if not ok:
        return 1
    print('✅ self-test 通过')
    return 0


def main() -> None:
    ap = argparse.ArgumentParser(description='死 i18n key 门禁（Q6：存量记账 / 新增拦截）')
    ap.add_argument('--self-test', action='store_true', help='构造样例自验 exit 语义')
    ap.add_argument('--dump-baseline', action='store_true', help='输出当前死 key JSON（生成基线用）')
    ap.add_argument('--fake-root', help='（self-test 内部用）替代仓根的假目录')
    args = ap.parse_args()
    global ROOT, CLIENT, EN_JSON, BASELINE, SCAN_ROOTS
    if args.fake_root:
        ROOT = Path(args.fake_root)
        CLIENT = ROOT / 'apps' / 'client-app'
        EN_JSON = CLIENT / 'locales' / 'en.json'
        BASELINE = ROOT / 'scripts' / 'gate' / 'dead-i18n-key-baseline.json'
        SCAN_ROOTS = [CLIENT / 'app', CLIENT / 'src']
    if args.self_test:
        sys.exit(self_test())
    if args.dump_baseline:
        dead = sorted(dead_keys())
        print(json.dumps({'entries': [{'key': k, 'reason': '存量（批3 基线建立时点）'} for k in dead]},
                         ensure_ascii=False, indent=2))
        return
    sys.exit(run_check())


if __name__ == '__main__':
    main()
