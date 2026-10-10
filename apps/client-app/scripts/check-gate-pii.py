#!/usr/bin/env python3
"""mock PII 扫描（第四轮修复 P0-1 / V6+V11）

目标：mocks/data/*.json 不得含真实 PII——
  1. 中国大陆真实格式手机号（1[3-9]\\d{9}，11 位）
  2. 人名上下文中的中文名——仅当对象含 phone 类字段（个人记录语义：用户/收货人/
     联系人/持卡人）时，其 name/userName/contactName/holderName/nickname 字段
     命中 CJK 即 fail。商品名 .name.zh、券名（coupons 无 phone 字段）等业务文案
     不属 PII，不判。
     notifications.data.riderName 属展示用泛称（"陈师傅"），且无 CJK 全名语义，
     不在本扫描范围（与方案 v2「其余 10 个 json 不动」口径一致）。

误报排除：
  - unsplash / picsum 等图片 URL 整值跳过（?w=400 宽度段会被手机号正则误计，
    v1「24 处手机号」即此误计）
  - +670 东帝汶国际区号占位（脱敏后的合法形态，天然不匹配 1[3-9] 开头）

用法：python3 scripts/check-gate-pii.py
exit 0 = 无命中；exit 1 = 有 PII 命中（列出 文件.路径）
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MOCK_DIR = ROOT.parent / "mocks" / "data"

# 真实格式中国大陆手机号（mock 占位一律用 +670770000xx 东帝汶段位）
PHONE_RE = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")
# 人名字段（仅个人记录上下文判 CJK）
PERSON_NAME_FIELDS = {"name", "username", "contactname", "holdername", "nickname"}
CJK_RE = re.compile(r"[一-鿿]")
# 图片 URL 整值跳过（unsplash 宽度段误报源）
URL_RE = re.compile(r"https?://(images\.)?(unsplash|picsum|placeholder)\.[a-z]")


def scan(value, field, where, person_ctx, hits, fname):
    """person_ctx：当前对象是否含 phone 类字段（个人记录语义）。"""
    if isinstance(value, dict):
        has_phone = any("phone" in k.lower() for k in value)
        for k, v in value.items():
            scan(v, k, f"{where}.{k}", has_phone, hits, fname)
    elif isinstance(value, list):
        for i, v in enumerate(value):
            scan(v, field, f"{where}[{i}]", person_ctx, hits, fname)
    elif isinstance(value, str):
        # 图片 URL 整值跳过（unsplash ?w=400 宽度段是手机号正则的已知误报源）
        if URL_RE.search(value):
            return
        for m in PHONE_RE.finditer(value):
            hits.append(f"{fname}{where}.{field}: 手机号 {m.group()}")
        if person_ctx and field.lower() in PERSON_NAME_FIELDS and CJK_RE.search(value):
            hits.append(f"{fname}{where}.{field}: 人名含中文 {value!r}")


def main() -> int:
    if not MOCK_DIR.is_dir():
        print(f"[pii] mock 目录不存在: {MOCK_DIR}", file=sys.stderr)
        return 1
    total_hits: list[str] = []
    for jf in sorted(MOCK_DIR.glob("*.json")):
        try:
            data = json.loads(jf.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            print(f"[pii] {jf.name} JSON 解析失败: {e}", file=sys.stderr)
            return 1
        hits: list[str] = []
        scan(data, "", "", False, hits, jf.name)
        total_hits.extend(hits)

    if total_hits:
        print(f"❌ [pii] mocks 发现 {len(total_hits)} 处真实 PII：")
        for h in total_hits:
            print(f"  - {h}")
        print("处置：手机号改 +670 占位 / 人名改东帝汶语义匿名名（参考 mocks/data/user.json 现状）")
        return 1
    print(f"✅ [pii] {MOCK_DIR.name}/ 全量扫描 0 真实格式手机号 / 0 中文人名")
    return 0


if __name__ == "__main__":
    sys.exit(main())
