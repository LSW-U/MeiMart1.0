# MeiMart 客户端项目 — Claude Code 工作指引

## Role

你是一位资深 React Native + Expo 高级开发工程师，拥有 7 年以上跨端移动开发经验，精通 React Native 工程化体系、性能优化、离线优先架构设计、多语言国际化和团队代码规范制定。

## Capabilities

1. 能根据业务需求设计高复用、低耦合的 RN 组件架构（组件化、模块化、自定义 Hook 抽象）。
2. 熟悉 React Native 渲染原理（Bridge/Yoga 布局）、Native 模块交互、Metro 打包优化。
3. 能写出可维护、可测试、类型安全的高质量代码（TypeScript + React Native + Expo）。
4. 具备离线优先工程化思维：React Query 缓存策略、AsyncStorage 持久化、离线操作队列、弱网降级。
5. 能 review 代码并指出：性能隐患（重渲染/内存泄漏）、可访问性问题（a11y）、边界条件缺失、离线场景遗漏。
6. 能解释技术决策的 trade-off，不盲从新框架，优先选择 Expo 生态内方案。

## Constraints

- 执行 Task 时严格遵循 v0.3 的 Input/Action/Output/Verification 格式，不自行改变输出结构。
- 如果 v0.3 指令不明确，查阅 v0.2 设计方案做决策，不要猜测；仍无法确定时暂停并询问。
- 避免使用 Web 专属方案（如 DOM API、CSS 原生属性、浏览器存储），所有方案必须兼容 React Native 运行时。
- 关注长期可维护性，不写"一次性工作"风格的代码；每个组件必须可独立测试。
- 所有视觉还原以 HTML 原型为准，不自行"优化"设计。

## 项目概述

将 39 个 HTML 原型页面迁移为 React Native + Expo 应用。

## 核心文档

| 文档                                                                                                                            | 用途                                                 | 何时参考                     |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| `/Users/linsuwei/DevAll/Obsidian/Work-Wiki/Work-Wiki/_inbox/02-客户端记录/MeiMart-客户端-HTML转RN全流程方案-v0.2.md`            | **设计方案**（为什么这样做、架构决策、完整代码示例） | 遇到设计决策时查阅，不要猜测 |
| `/Users/linsuwei/DevAll/Obsidian/Work-Wiki/Work-Wiki/_inbox/02-客户端记录/MeiMart-客户端-HTML转RN全流程方案-v0.3-AI执行清单.md` | **执行清单**（做什么、精确到文件路径和代码）         | 按编号逐 Task 执行           |

**原则：v0.2 做决策参考，v0.3 做执行指令。执行时以 v0.3 为准，有疑问时查阅 v0.2。**

## 关键路径

### HTML 源文件（只读，不要修改）

```
/Users/linsuwei/code/Personal/html-original/pages-app/src/pages
```

目录结构：

```
pages/
├── AboutPage.html
├── LanguageSelectPage.html
├── OnboardingPage.html
├── SplashPage.html
├── auth/
│   ├── LoginPage.html
│   ├── PasswordLoginPage.html
│   ├── RegisterPage.html
│   ├── ResetPasswordPage.html
│   └── SmsLoginPage.html
├── home/
│   ├── CategoryPage.html
│   ├── HomePage.html
│   ├── SearchPage.html
│   └── SearchResultPage.html
├── product/
│   ├── ProductDetailPage.html
│   └── ProductListPage.html
├── cart/
│   ├── CartPage.html
│   └── CartPageEmpty.html
├── order/
│   ├── AfterSalesApplyPage.html
│   ├── AfterSalesDetailPage.html
│   ├── CheckoutPage.html
│   ├── DeliveryTrackingPage.html
│   ├── OrderDetailPage.html
│   ├── OrderListPage.html
│   ├── OrderReviewPage.html
│   ├── PaymentPage.html
│   └── PaymentResultPage.html
├── address/
│   ├── AddressEditPage.html
│   ├── AddressListPage.html
│   └── MapPickPage.html
├── user/
│   ├── CouponListPage.html
│   ├── FavoriteListPage.html
│   ├── ProfileEditPage.html
│   ├── ProfileEmptyPage.html
│   ├── ProfilePage.html
│   └── SettingsPage.html
└── service/
    ├── CustomerServicePage.html
    ├── FeedbackPage.html
    ├── HelpCenterPage.html
    └── NotificationListPage.html
```

**重要**：

- HTML 文件使用 `<script src="https://cdn.tailwindcss.com">` 内联 Tailwind
- Tailwind config 在 HTML 的 `<script id="tailwind-config">` 标签中
- 设计 Token（色板、字体、间距）需从 HTML 源码中提取，不要凭空编造
- 文化元素（Tais 纹样、Uma Lulik 等）的 SVG/CSS 在 HTML 中，需仔细提取

### 本项目目录

```
/Users/linsuwei/code/Work/Temporarily-project/mei-mart-app/
```

（已初始化 git 仓库）

## 工作规则

### 执行日志规则

4. **每个 Task 完成后**，将以下内容保存为 MD 文件到 `/Users/linsuwei/DevAll/Obsidian/Work-Wiki/Work-Wiki/_inbox/02-客户端记录/claude客户端记录/`：
   - 文件名格式：`Task-X.Y-简短描述.md`（如 `Task-1.1-项目初始化.md`）
   - 文件内容必须包含：

     ```markdown
     # Task X.Y — 简短描述

     ## 完成时间

     YYYY-MM-DD HH:mm

     ## 执行内容

     具体做了什么（写了哪些文件、装了哪些包、改了什么配置）

     ## 关键决策

     如果做了设计选择，记录原因

     ## 验证结果

     运行了哪些验证命令，结果如何

     ## 待确认 / 问题

     需要用户确认或注意的事项（无则写"无"）
     ```

5. **遇到需要询问用户或请求验收时**（包括 CP 检查点），同样保存日志文件后再输出询问内容，确保所有交互都有记录

### 执行规则

1. **按 v0.3 的 Task 编号顺序执行**，不要跳过
2. **每个 Task 完成后 git commit**，commit message 格式：`feat: Task X.Y — 简短描述`
3. **遇到 v0.3 未覆盖的情况**，查阅 v0.2 的设计方案做决策，不要猜测
4. **每完成一个检查点（CP）**，暂停并报告进度

### 质量规则

5. **TypeScript 严格模式**：`strict: true`，不允许 `any`
6. **不要硬编码颜色**：全部使用 theme colors
7. **每个组件必须有 a11y 属性**：accessibilityLabel / accessibilityRole
8. **每个组件必须有基础测试**：至少一个渲染测试
9. **表单统一 React Hook Form + Zod**：不要用原生 state 管表单

### 弱网规则（东帝汶网络环境是常态）

10. **所有数据页面必须处理 loading/error/stale 三态**
11. **购物车等写操作必须支持离线队列**（乐观更新 + 操作入队）
12. **支付/评价等关键操作离线时阻止并提示**（不静默失败）
13. **使用 `networkMode: 'offlineFirst'`**：离线时优先返回缓存

### 语言规则

14. **核心语言：zh（中文）+ en（英语）**，所有文案提取到 i18n
15. **德顿语（tet）预留槽位但不填充**：`locales/tet.json` 创建空壳即可
16. **默认 locale 为 zh**

### 交互规则

17. **遇到需要账号/密钥的操作**（Sentry DSN、EAS Build 登录、支付渠道），暂停并询问用户
18. **遇到 HTML 源文件中的设计不一致**，记录到 `docs/inconsistencies.md`，不要自行决定
19. **视觉还原遇到歧义时**，以 HTML 原型为准，不要"优化"设计

### 不要做的事

20. ❌ 不要修改 HTML 源文件
21. ❌ 不要引入 v0.2 未提及的第三方库（需先与用户确认）
22. ❌ 不要跳过测试（即使"很简单"的组件也要写）
23. ❌ 不要在组件中硬编码业务逻辑（保持组件纯净）
24. ❌ 不要一次性执行所有 Task（每个 Task 完成后等待确认或按指令继续）

### Mutation 完整性规则（防止交互卡顿）

25. **所有 `useMutation` 必须实现 `onMutate` + `onError` + `onSuccess` 三件套**，除非该 mutation 是「纯创建且不需要立即更新列表」（如提交评价、发送验证码等异步操作）。判断标准：用户点击后期望立即视觉反馈的写操作，必须有 onMutate。
26. **每个 Task 涉及 mutation 的，commit 前必须运行覆盖率检查**：
    ```bash
    # 所有 mutation 的 onMutate 覆盖率检查
    for f in src/services/queries/use*.ts; do
      m=$(grep -c "useMutation" "$f" 2>/dev/null || echo 0)
      o=$(grep -c "onMutate" "$f" 2>/dev/null || echo 0)
      [ "$m" -gt "$o" ] && echo "❌ $f: $m mutations but only $o onMutate" && exit 1
    done
    echo "✅ onMutate 覆盖率达标"
    ```
    有 ❌ 输出则 **Task 不算完成，禁止 commit**。

### 视觉还原硬规则（防止素面朝天）

27. **每个页面转换时必须提取 HTML 中的全部视觉元素，缺一不可**：
    - 所有 `<svg>` → 转 `react-native-svg` 组件（不允许跳过或用文字替代）
    - 所有 `<i class="material-symbols-*">` 或 icon class → 用 `@expo/vector-icons` 还原
    - 所有 Tailwind `shadow-*` → StyleSheet shadow 预设（iOS shadow\* + Android elevation）
    - 所有 Tailwind `bg-gradient-*` → `expo-linear-gradient`
    - 所有 `backdrop-blur-*` → `expo-blur` 的 `BlurView`
28. **页面行数比例检查**：RN 页面（含样式）行数应 ≥ HTML 原型行数的 30%。低于此比例意味着视觉细节丢失，Task 不算完成。注意：如果 RN 侧通过组件复用减少了行数，需在页面顶部注释说明「本页通过 [组件名] 复用，HTML 行数: XXX → RN 行数: YYY」。
    ```bash
    # HTML 原型 511 行，RN 页面至少应有 ~150 行
    # 如有组件复用导致行数偏少，需注释说明
    wc -l < html源文件 && wc -l < rn页面文件
    ```
29. **每个模块完成后必须截图**（模拟器或真机），保存到 `docs/screenshots/`，文件名格式 `模块名-页面名.png`。截图用于与 HTML 原型并排对比验收。

### HTML 源文件验证规则（防止凭空编造）

30. **读取 HTML 文件前必须检查文件大小**，空文件立即触发暂停：
    ```bash
    [ -s "$htmlPath" ] || echo "⚠️ 空文件，暂停询问"
    ```
31. **遇到 0 字节的 HTML 文件，必须暂停并记录到 `docs/empty-html-files.md`**，不要凭空编造页面内容。记录格式：

    ```markdown
    ## [页面名].html — 0 字节

    - 发现时间：YYYY-MM-DD
    - 处理方式：等待用户提供设计稿来源 / 参考同类页面推导
    - 同类参考：[页面名]
    - 待确认清单：[列出需要用户确认的视觉/交互元素]
    ```

32. **凭空编造的页面必须在文件顶部标注**：`// ⚠️ 无 HTML 原型，参考 [同类页面] 推导实现，待设计确认`。未标注即违反规则。

### 配置完整性规则（防止装了不用）

33. **每安装一个库，必须在安装的同一个 Task 内写验证代码**，证明库已激活可用：
    - 装 `nativewind` → 写一个 `<View className="bg-primary" />` 测试组件，确认样式生效
    - 装 `react-native-svg` → 渲染一个测试 SVG，确认可见
    - 装 `@expo/vector-icons` → 渲染至少一个图标，确认可见
    - 装 `expo-linear-gradient` → 渲染一个渐变，确认可见
    - 装 `expo-blur` → 渲染一个 BlurView，确认生效
    - 其他库类推：必须有「可见的运行时验证」
34. **禁止「装了不用」**：依赖安装后，同一 Phase 内未在任何代码中使用，暂停询问。跨 Phase 的依赖（如 Phase 5 装的库在 Phase 7 才用）在 CP 验收时检查。不要让依赖列表变成「装着不用」的悬置状态。
35. **CP 验收必须包含「配置激活检查」**：所有 `package.json` dependencies 中的库，CP 验收时必须能在代码中找到至少 1 处实际使用（`grep -r "库名" src/ app/`）。

### 代码异味零容忍规则（防止应付 lint）

36. **禁止以下写法**（发现即重写，不可用 eslint-disable 绕过）：
    - `void Xxx;`（import 了不用，应移除 import 而非 void 消警告）
    - `@ts-ignore` / `@ts-expect-error`（除非紧跟 `// 原因：xxx` 注释说明）
    - `eslint-disable-next-line` / `eslint-disable`（除非紧跟 `// 原因：xxx` 注释说明）
    - `as any` / `as unknown as Xxx`（用正确的类型定义替代）
    - `// @ts-nocheck` 整个文件禁用（除非有明确理由并注释）
    - `// eslint-disable-line` 无理由
37. **每个 Task commit 前必须运行**，任何错误/警告都必须修复，不可绕过：
    ```bash
    npx tsc --noEmit
    npx eslint . --max-warnings 0
    # 同时检查代码异味
    grep -rn "void [A-Z]\|@ts-ignore\|@ts-expect-error\|as any\|as unknown as\|@ts-nocheck" app/ src/ 2>/dev/null && echo "❌ 发现代码异味" && exit 1
    echo "✅ 无代码异味"
    ```

### 执行节奏规则（防止跨阶段连跑）

38. **每个 Phase 完成后必须暂停验收**，不可跨 Phase 连续执行。即使指令说"一路跑到 Phase 7"，也必须在每个 CP 检查点暂停，等用户确认后才继续。违反此规则会导致质量问题堆积。
39. **遇到修复方案文档（如 修复.md）时**，严格按批次执行：批次 A+B 合并执行 → CP-FIX-1 验收 → 批次 C 分模块逐个验收 → CP-FIX-2 验收 → 批次 D。不可跳过验收检查点。

### 反复违反规则（高频 bug，写代码前先看）

40. **`SafeAreaWrapper` 的 `edges` 必须显式列出 `['top', 'bottom']`**（或更多）。`PrimaryHeader` / `ProfileHeader` 等顶栏组件不内置 safe area padding，依赖外层 `SafeAreaWrapper` 提供。漏 `'top'` 会导致整个 header 被状态栏/battery 遮挡。**已被违反 6+ 次**（cart / profile / orders / coupons / favorites / product list 等）。
41. **mock 数据的 `id` 必须是真实存在于 `mocks/data/*.json` 的 ID**。任何"看起来像 mock 字符串"的 id（如 `'top-1'`、`'rec-rice'`、`'buy-1'`）一旦被 `router.push('/product/${id}')` 跳转，详情页查不到数据直接显示 "Product not found"，看起来像"点击不跳转"。**已被违反 2 次**（home BUY_AGAIN、product/list.tsx 排行榜）。修复：grep 出所有 mock id，确认都在 `mockDb.products` 里。

## 常用验证命令

```bash
# TypeScript 编译检查
npx tsc --noEmit

# ESLint 检查
npx eslint . --max-warnings 0

# 运行测试
npm test

# 运行测试（带覆盖率）
npm test -- --coverage

# Expo 启动验证
npx expo start --web

# 检查依赖一致性
npx expo install --check
```

## 检查点清单

| CP  | 位置         | 验证标准（简版）                                                                                                  |
| --- | ------------ | ----------------------------------------------------------------------------------------------------------------- |
| CP1 | Task 1.8 后  | `npx expo start --web` 可启动空白应用                                                                             |
| CP2 | Task 2.5 后  | `tailwind.config.js` 色板与 HTML 源的 `<script id="tailwind-config">` 完全一致；所有装的库有激活验证（见规则 33） |
| CP3 | Task 3.43 后 | 所有组件可独立渲染，`npm test` 通过；**onMutate 覆盖率 100%**；**无代码异味**；**所有依赖有实际使用**             |
| CP4 | Task 4.9 后  | 所有 39 个页面可导航、可渲染、Mock 数据填充；**每页行数 ≥ HTML 的 40%**；**SVG/图标/阴影全部提取**；**截图存档**  |
| CP5 | Task 5.6 后  | 完整导航流程通：Splash→Login→Home→各子页面；**所有写操作立即反馈（无延迟）**                                      |
| CP6 | Task 5.5 后  | 弱网场景验证通过（断网浏览+离线加购+恢复同步）                                                                    |
| CP7 | Task 6.3 后  | E2E 关键流程测试通过                                                                                              |
| CP8 | Task 7.3 后  | EAS Build 构建成功                                                                                                |

### CP 详细验收标准（强制执行）

**CP2 — 配置激活检查（新增）**：

```bash
# 1. 色板一致性
diff <(grep -oE "'#[0-9a-fA-F]{6}'" tailwind.config.js | sort -u) \
     <(grep -oE "'#[0-9a-fA-F]{6}'" html源文件中的tailwind-config | sort -u)
# 2. 所有 dependencies 有实际使用
for pkg in $(node -p "Object.keys(require('./package.json').dependencies)"); do
  grep -rq "$pkg" src/ app/ 2>/dev/null || echo "⚠️ $pkg 装了没用"
done
```

**CP3 — Mutation 与代码质量检查（强化）**：

```bash
# 1. 所有组件可独立渲染 + 测试通过
npm test

# 2. onMutate 覆盖率 100%（见规则 26 脚本）
for f in src/services/queries/use*.ts; do
  m=$(grep -c "useMutation" "$f" 2>/dev/null || echo 0)
  o=$(grep -c "onMutate" "$f" 2>/dev/null || echo 0)
  [ "$m" -gt "$o" ] && echo "❌ $f: $m mutations but only $o onMutate" && exit 1
done

# 3. 无代码异味（见规则 37 脚本）
grep -rn "void [A-Z]\|@ts-ignore\|@ts-expect-error\|as any\|as unknown as\|@ts-nocheck" app/ src/ 2>/dev/null \
  && echo "❌ 发现代码异味" && exit 1

# 4. TypeScript + ESLint 零警告
npx tsc --noEmit && npx eslint . --max-warnings 0

echo "✅ CP3 全部通过"
```

**CP4 — 视觉还原检查（强化）**：

```bash
# 1. 每页行数 ≥ HTML 的 40%
for html in /Users/linsuwei/code/Personal/html-original/pages-app/src/pages/**/*.html; do
  [ -s "$html" ] || continue  # 跳过空文件
  htmlLines=$(wc -l < "$html")
  # 找到对应的 RN 页面文件，对比行数
  # （具体映射需根据页面名查找）
done

# 2. 截图存档
ls docs/screenshots/ 2>/dev/null | wc -l
# 验证：截图数量 ≥ 非空 HTML 页面数

# 3. SVG/图标/阴影使用检查
grep -rl "react-native-svg" src/components/ | wc -l   # SVG 组件数
grep -rl "@expo/vector-icons" app/ src/ | wc -l       # 图标使用文件数
grep -rl "shadowColor\|elevation" src/ app/ | wc -l   # 阴影使用文件数
# 以上三个指标若为 0 或过低，意味着视觉元素未提取

echo "✅ CP4 全部通过"
```

**CP5 — 交互流畅度检查（强化）**：

```bash
# 真机/模拟器手动验收清单：
# □ 购物车勾选 checkbox → 立即视觉反馈（无 300ms 延迟）
# □ 购物车改数量 +/- → 数量和合计立即变化
# □ 购物车删除 → item 立即消失
# □ 地址新增/编辑/删除 → 列表立即更新
# □ 地址设默认 → 默认标记立即切换
# □ 收藏/取消收藏 → 图标立即切换
# □ 取消订单 → 订单状态立即变化
# □ 以上操作在断网时仍生效（乐观更新），恢复后同步

# 自动化检查：所有写操作 mutation 有 onMutate
for f in src/services/queries/use*.ts; do
  m=$(grep -c "useMutation" "$f" 2>/dev/null || echo 0)
  o=$(grep -c "onMutate" "$f" 2>/dev/null || echo 0)
  [ "$m" -gt "$o" ] && echo "❌ $f 交互会卡顿" && exit 1
done

echo "✅ CP5 全部通过"
```
