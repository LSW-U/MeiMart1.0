# scripts/gate — 跨端批5 门禁脚本（2026-10-01）

Q6 语义（总指挥拍板）：**存量记账不拦截 / 新增拦截**。两脚本均自带 `--self-test`。

| 脚本 | 挂接 | 扫什么 | 基线 |
|---|---|---|---|
| `mock-escape-check.py` | 两端 `check:gate-mock` | FORCE_MOCK / pay-mock / 恒mock / mockDb（测试文件与 mockDb.ts 定义豁免） | `mock-escape-baseline.json`（键=文件::模式） |
| `fake-green-check.py` | 两端 `check:gate-fake-green` | 失败语义用例名（error/fail/404/…）× 仅 toBeTruthy 断言 | `fake-green-baseline.json`（键=文件::标题前24字） |

- 存量命中 → 计数输出 exit 0；基线外新增 → exit 1 列明 文件:行。
- 新增逃逸/假绿处置：修掉，或带豁免理由写入对应 baseline（reason 字段）。
- 基线项已无命中时脚本会提示同步删基线（不拦截）。

同批 B1：`check-i18n-keys.py`（两端各自 scripts/）新增 B1 记账段
（service 层 `{ zh:` 烘焙字面量 + 硬编码中文兜底），默认记账 exit 0，`--strict` 才拦截
（两端 check 命令未接 --strict，升级由总指挥拍板）。

## 语义边界与口径声明（批5 审查裁决，20261001）

- **P3-1（文件级豁免）**：mock-escape 基线键粒度 = `文件::模式`，属**文件级豁免**——同文件同模式的新增命中会被基线豁免、不会被拦截（fake-green 键=标题前 24 字符同理，标题变化即换键，风险更低）。计数对账升级与 B1 `--strict` 升级时点留待总指挥拍板。
- **P3-2（B1 口径）**：`check-i18n-keys.py` 的 B1 记账（service 烘焙字面量/硬编码中文）**仅 client 口径**——rider 是独立方言脚本（扁平 key / `{var}` 插值），未注入 B1 检测；rider 对齐挂账（rider services 烘焙源待后端透传后自然消亡，另立项）。
