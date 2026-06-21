# 决策与对话复原工作流

## 这次的教训

2026-06-21 Lin 用 `/resume` 想恢复 OrderDetail 方案 A/B/C 的决策讨论，
发现对话不在 resume 列表里，Claude Code 也找不到讨论内容。
只能从 commit message + Lin 的截屏反向重建，**完整的对比维度差点丢失**。

## 为什么没找到 — 根因分析

### 根因 1：对话上下文 ≠ 持久化存储

Claude Code 的对话保存在：

```
~/.claude/projects/<project-hash>/<session-id>.jsonl
```

但：

- `/resume` 命令只列出 **最近 N 条** 会话，超出窗口的会话不会显示
- 会话过期会被清理（默认 30 天）
- 不同 Claude Code 版本之间 session 文件位置/格式可能变化
- 如果中途切了目录、关了终端、网络抖动，session 可能没落盘

### 根因 2：决策没落到 git 仓库

讨论方案 A/B/C 时，**完整对比只在对话里**，没有：

- 写成 ADR（Architecture Decision Record）
- commit 到代码仓库
- 保存到 Obsidian

→ git log 里只能看到「**按方案 A** 在 `[id].tsx` 局部范围继续打磨」一行 commit message。
→ 想找完整的 A/B/C 对比，无任何文件可搜。

### 根因 3：commit 不及时

如果讨论完方案 A 之后**立即 commit** 一个空 commit 或 docs commit：

```
docs(decisions): 采纳方案 A 处理 OrderDetail 重构（拒绝方案 C）
```

那 commit message 就成了**最可靠的索引**。即使对话丢了，`git log --grep="方案"` 就能找回。

但这次没有，所以只能从 2 个修复 commit 的 message 里**反向推断**。

## 下次怎么及时复原 — 标准工作流

### 触发条件（必须立即写 ADR）

讨论中**任一条件成立**时，必须当场写 ADR：

- 提出「方案 A / B / C」或「选项 1 / 2 / 3」做对比
- 用「trade-off」「优缺点」「YAGNI」「过度设计」等决策词汇
- 用户说「先这样做」「我决定」「按这个走」之类拍板语句
- 选择了**不做**某事（拒绝 X 也是决策）
- 做了**架构性**修改（抽组件、改 store、换库、改路由结构）

### ADR 标准流程（5 分钟内完成）

**1. 创建文件**：`docs/decisions/NNNN-kebab-case-title.md`

- NNNN = 4 位序号，从 0001 开始
- 文件名用英文 kebab-case

**2. 必含章节**（参考 `0001-order-detail-refactor-choose-a-not-c.md`）：

- 元信息（日期、状态、决策人、相关 commit）
- 背景
- 方案对比表
- 决策 + 理由
- 后续触发条件（什么情况下会重新评估）

**3. 立即 commit**：

```bash
git add docs/decisions/NNNN-*.md
git commit -m "docs(adr): NNNN — 决策标题"
```

**4. 如果对话中讨论了细节**，把对话中**超出 ADR 内容**的部分（比如具体的代码示例、用户给的截屏描述）也补到 ADR 的「讨论细节」章节。

### 复原检索路径（按优先级）

下次找不到时，**按此顺序找**：

1. **`git log --grep="关键词"`** — 最可靠

   ```bash
   git log --grep="方案"
   git log --grep="决策"
   git log --grep="ADR"
   git log --grep="拒绝"
   ```

2. **`docs/decisions/` 目录** — ADR 落脚点

   ```bash
   ls docs/decisions/
   ```

3. **Obsidian 客户端记录目录**

   ```
   /Users/linsuwei/DevAll/Obsidian/Work-Wiki/Work-Wiki/_inbox/02-客户端记录/claude客户端记录/
   ```

   用 `grep -rn "关键词" 目录`

4. **`/resume` 命令** — 最后才用，可能不在列表
   - 即使在列表，恢复的也是 raw 对话，需要重新读一遍提取决策

5. **`~/.claude/projects/<hash>/*.jsonl`** — 终极兜底
   ```bash
   ls -lt ~/.claude/projects/ | head -5
   # 找最近的项目目录
   ls -lt ~/.claude/projects/<hash>/*.jsonl | head -10
   # 然后用 grep 搜关键词
   grep -l "OrderDetail.*方案" ~/.claude/projects/<hash>/*.jsonl
   ```

### Commit 时机的硬规则

为了避免「事后反向推断」，**讨论完决策立即做以下三件事**：

1. **写 ADR 到 `docs/decisions/`**
2. **commit ADR**：`docs(adr): NNNN — 决策标题`
3. **在 PR / 后续 commit 中引用 ADR 编号**：
   ```
   feat: OrderDetail UI 优化（ref ADR-0001）
   ```

这样：

- git log --grep "ADR" → 找到决策列表
- ADR-0001 引用 → 找到对应文件
- ADR 文件 → 找到完整讨论

### 如果决策被推翻

**不允许直接修改原 ADR**。新建一份：

```
docs/decisions/0002-order-detail-refactor-upgrade-to-c.md
```

内容里在「元信息」章节写：

- 状态：推翻 ADR-0001，升级到方案 C
- 推翻原因：...
- 触发条件已满足的证据：...

保持原 ADR 不动，方便后续追溯决策演化。

## 给 Claude Code 的指令

每次讨论方案 A/B/C 或架构决策时，**主动提醒用户**：

> 这个决策要不要写 ADR？我可以现在就创建 `docs/decisions/NNNN-*.md` 并 commit。

不要等用户问，主动提议。这次就是因为 Claude Code 没主动提议，导致决策只活在对话里。
