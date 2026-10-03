# MeiMart 后端需求清单（前端联调发现）

> ⚠️ **历史文档声明（2026-10-03，后端联调需求批次模块批0 核对）**：本文件为 7 月联调旧文档复活。现状核对结论以《后端联调需求批次》模块为准：
> `Work-Wiki/_inbox/04-后端记录/三端优化更新/后端联调需求批次/执行日志/批0-证据归档-20261003.md`（curl 实测 + openapi 契约核对证据）。
> 摘要：§二.1 createOrder items、§二.2 geocode、§二.4 defaultSkuId、§三.2 payments/methods 均**已在后端 main@5087325 落地并实测通过**（来源=W7/批B 提前落地）；§二.3 支付方式枚举由 /client/payments/methods 端点方案取代。仍开放：多语补 tet（§九.2）、W6 rider earnings/withdraw（§九.1）、search 多语化（§九.3）。
> 本文件保留作需求溯源记录，不再作为现状权威源更新。

> 本文档记录前端联调过程中发现的后端问题、需要的接口、期望的响应格式。请后端逐一处理。
>
> ~~⚠️ **本文件是唯一权威源（canonical）**~~（2026-10-03 起废止，见上方历史文档声明；Obsidian 镜像副本同步废止）。

---

## 一、已修复问题（确认即可）

### 1. CORS 配置缺少 Idempotency-Key

**状态**：✅ 已修复（`apps/api/src/main.ts:88`）

**修复内容**：`allowedHeaders` 已添加 `'Idempotency-Key'`

```typescript
allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-Id', 'X-Perspective', 'Accept-Language', 'X-Request-Id', 'Idempotency-Key'],
```

**验证**：前端创建订单请求不再被 CORS 拦截。

---

## 二、需要修复的问题

### 1. createOrder 响应缺少 items 字段 ❌ 高优先级

**问题**：`POST /api/v1/client/orders` 创建订单成功后，响应体**不包含 items 字段**，导致前端 `transformOrder` 报错：`Cannot read properties of undefined (reading 'map')`

**当前响应**（有问题）：
```json
{
  "success": true,
  "data": {
    "id": "2a585f02-...",
    "orderNo": "MM20260703010001",
    "status": "PENDING_CONFIRM",
    "warehouseId": "...",
    "totalAmount": 700,
    "deliveryFee": 500,
    "discountAmount": 0,
    "payableAmount": 700,
    "paymentMethod": "COD",
    "paymentStatus": "PENDING",
    "paymentMockFlag": false
    // ❌ 缺少 items 数组
  }
}
```

**期望响应**（包含 items）：
```json
{
  "success": true,
  "data": {
    "id": "2a585f02-...",
    "orderNo": "MM20260703010001",
    "status": "PENDING_CONFIRM",
    "warehouseId": "...",
    "totalAmount": 700,
    "deliveryFee": 500,
    "discountAmount": 0,
    "payableAmount": 700,
    "paymentMethod": "COD",
    "paymentStatus": "PENDING",
    "paymentMockFlag": false,
    "items": [
      {
        "id": "order-item-uuid",
        "productId": "...",
        "skuId": "...",
        "productName": { "zh": "...", "en": "...", "tet": "..." },
        "productImage": "https://...",
        "skuName": { "zh": "...", "en": "...", "tet": "..." },
        "unitPrice": 200,
        "quantity": 1,
        "subtotal": 200
      }
    ],
    "createdAt": "2026-07-03T07:31:06.485Z",
    "updatedAt": "2026-07-03T07:31:06.485Z"
  }
}
```

**影响**：前端已用 `(raw.items ?? []).map(...)` 兜底，但订单详情页无法显示商品列表。

**期望**：createOrder 响应包含完整的 items 数组，与 `GET /client/orders/:id` 一致。

---

### 2. 地址 lat/lng 下单必填，但前端无法选地图 ❌ 高优先级

**问题**：下单时后端要求地址有 `lat`/`lng`（用于 PostGIS 匹配仓库），否则报 409：
```
Delivery address missing lat/lng, please pick a point on map
```

但前端的地址编辑页（`/address/edit`）虽然有 "PIN ON MAP" 按钮跳转 `/address/map`，但地图选点后**无法把 lat/lng 传回编辑页**。

**当前前端临时方案**：创建/编辑地址时默认填充东帝汶帝力坐标（-8.5569, 125.5603），但所有地址都用同一坐标，**无法正确匹配仓库**。

**期望方案**（二选一）：

**方案 A（推荐）**：后端提供地理编码接口
```
GET /common/geo/geocode?address=Dili,Cristo+Rei
响应：{ "lat": -8.5569, "lng": 125.5603 }
```
前端用户输入地址文本，调用接口获取坐标。

**方案 B**：后端不强制要求 lat/lng，根据 province/city/district 文本匹配仓库（不推荐，匹配不准）。

---

### 3. 支付方式枚举与前端不匹配 ⚠️ 中优先级

**问题**：前端 mock 数据的支付方式 id（`laispay`/`bank`/`card`）与后端枚举不一致：

| 前端 mock id | toUpperCase() | 后端期望枚举 | 匹配 |
|--------------|---------------|--------------|------|
| laispay | LAISPAY | - | ❌ |
| bank | BANK | BANK_TRANSFER | ❌ |
| card | CARD | - | ❌ |

**后端期望枚举**：`'COD' | 'BANK_TRANSFER' | 'WECHAT' | 'PAYPAL' | 'STRIPE'`

**期望方案**（二选一）：

**方案 A（推荐）**：后端提供 `GET /client/payments/methods` 接口，返回可用支付方式列表：
```json
{
  "success": true,
  "data": [
    {
      "id": "COD",
      "name": { "zh": "货到付款", "en": "Cash on Delivery", "tet": "Paga serbi boot" },
      "subtitle": { "zh": "收货时支付现金", "en": "Pay cash when received", "tet": "..." },
      "icon": "payments",
      "isDefault": true,
      "enabled": true
    },
    {
      "id": "BANK_TRANSFER",
      "name": { "zh": "银行转账", "en": "Bank Transfer", "tet": "..." },
      "icon": "account_balance",
      "enabled": true
    }
  ]
}
```
前端直接消费后端数据，无需 mock。

**方案 B**：后端保持现状，前端硬编码 5 种支付方式（COD/BANK_TRANSFER/WECHAT/PAYPAL/STRIPE）。

---

### 4. 商品列表接口不返回 skus ❌ 高优先级

**问题**：`GET /client/products` 列表接口**不返回 skus 字段**，只有详情接口 `GET /client/products/:id` 返回。

前端加购、下单需要 SKU ID，但列表接口返回的 product 没有 `defaultSkuId`，导致每次加购都要额外查详情接口，**性能差**。

**期望**：列表接口返回每个商品的第一个 ACTIVE SKU id（或 `defaultSkuId` 字段）：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "662bf7af-...",
        "name": { "zh": "牛奶", "en": "Milk", "tet": "Susu" },
        "priceMin": 200,
        "mainImage": "https://...",
        "defaultSkuId": "e6edbcfa-ca26-4f60-b1f0-0042c47578c5",
        "salesCount": 288,
        ...
      }
    ]
  }
}
```

**影响**：前端加购/下单可直接用 `defaultSkuId`，无需额外查详情。

---

### 5. 购物车 items 缺少 skuId 暴露 ⚠️ 中优先级

**问题**：`GET /client/cart` 返回的 items 中有 `skuId` 字段，但前端 `transformCartItem` 没有保留（因为前端 `CartItem` 类型没有 skuId）。

当前前端用 `product.defaultSkuId` 或查详情获取 SKU ID，但购物车已经知道 `skuId`，**应该直接暴露**。

**期望前端改造**（已规划）：`CartItem` 类型添加 `skuId` 字段，下单时直接用 `item.skuId`。

**后端无需改动**，但需要确认 `GET /client/cart` 和 `GET /client/orders/:id` 的 items 都包含 `skuId` 字段。

---

## 三、需要新增的接口

### 1. Admin Web 订单管理接口 ✅ 已有

**现状**：后端已有 `GET /api/v1/admin/orders`，可用 super_admin token 查询所有订单。

**验证**：
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/common/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"role":"super_admin","deviceType":"admin_web"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")

curl -s "http://localhost:3000/api/v1/admin/orders?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**期望**：确认接口支持以下查询参数：
- `status`：按状态筛选（PENDING_CONFIRM/PAID/SHIPPED/DELIVERED/CANCELLED）
- `userId`：按用户筛选
- `startDate` / `endDate`：按时间筛选
- `keyword`：按订单号搜索
- `page` / `pageSize`：分页

---

### 2. Admin Web 用户管理接口 ❌ 缺失

**问题**：后端**没有** `GET /api/v1/admin/users` 接口，无法查看所有注册用户。

**期望接口**：
```
GET /api/v1/admin/users?page=1&pageSize=20&keyword=phone
```

**期望响应**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "...",
        "phone": "+67071112222",
        "name": "Test User",
        "email": "",
        "role": "CUSTOMER",
        "status": "ACTIVE",
        "createdAt": "2026-07-03T06:32:55.314Z",
        "orderCount": 5,
        "totalSpent": 123.45
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

**用途**：admin-web 用户列表页、用户详情页。

---

### 3. Admin Web 商品管理接口 ❌ 缺失

**期望接口**：
- `GET /api/v1/admin/products` - 商品列表（含分页、筛选）
- `POST /api/v1/admin/products` - 创建商品
- `PATCH /api/v1/admin/products/:id` - 更新商品
- `DELETE /api/v1/admin/products/:id` - 删除商品（软删除）
- `POST /api/v1/admin/products/:id/skus` - 添加 SKU
- `PATCH /api/v1/admin/skus/:id` - 更新 SKU

---

### 4. Admin Web 仪表盘统计接口 ❌ 缺失

**期望接口**：
```
GET /api/v1/admin/dashboard/stats
```

**期望响应**：
```json
{
  "success": true,
  "data": {
    "todayOrders": 15,
    "todayRevenue": 1234.56,
    "pendingOrders": 8,
    "totalUsers": 100,
    "totalProducts": 50,
    "lowStockProducts": 3
  }
}
```

---

## 四、响应格式统一性建议

### 1. 分页响应统一格式

当前 `GET /client/orders` 用 `items + nextCursor + hasMore`（游标分页），`GET /client/products` 用 `items`（无分页信息）。

**期望统一为**：
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

或保留游标分页，但所有列表接口都一致使用。

---

### 2. 金额单位统一

**现状**：后端金额单位是「分」（整数），前端用「元」。

**确认**：所有金额字段（`totalAmount`/`payableAmount`/`unitPrice`/`deliveryFee`/`discountAmount`）都是分，前端 `/100` 转换。

**期望**：保持一致，文档明确标注「单位：分」。

---

### 3. 本地化字段格式

**现状**：`name`/`productName`/`skuName`/`description` 等字段是 `{ zh, en, tet, ... }` 对象。

**确认**：所有本地化字段都用对象格式，前端用 `pickLocalized` 函数取当前语言。

**期望**：保持一致，所有文本字段都支持多语言。

---

## 五、Admin Web 应用搭建建议

### 1. 技术栈建议

- **框架**：Next.js 14（App Router）
- **UI 库**：Ant Design 5 / shadcn/ui
- **状态管理**：Zustand + TanStack Query
- **表格**：TanStack Table
- **图表**：Recharts
- **认证**：复用后端 mock-login（dev）或正式登录（prod）

### 2. 页面规划

| 页面 | 路由 | 功能 |
|------|------|------|
| 登录 | `/login` | admin 登录 |
| 仪表盘 | `/` | 今日订单/收入/用户统计 |
| 订单管理 | `/orders` | 订单列表、详情、状态流转 |
| 用户管理 | `/users` | 用户列表、详情、订单历史 |
| 商品管理 | `/products` | 商品列表、编辑、SKU 管理 |
| 分类管理 | `/categories` | 分类树管理 |
| 地址管理 | `/addresses` | 查看所有地址 |
| 优惠券 | `/coupons` | 优惠券发放管理 |
| 设置 | `/settings` | 系统配置 |

### 3. 关键功能

- **订单状态流转**：PENDING_CONFIRM → PREPARING → READY → DELIVERING → DELIVERED
- **骑手分配**：手动/自动分配骑手
- **库存管理**：SKU 库存预警
- **数据导出**：订单/用户 CSV 导出
- **操作日志**：admin 操作审计

---

## 六、优先级排序

| 优先级 | 任务 | 影响范围 |
|--------|------|----------|
| P0 | createOrder 响应包含 items | 下单后无法显示订单详情 |
| P0 | 地址 lat/lng 解决方案 | 下单 409 错误 |
| P0 | 商品列表返回 defaultSkuId | 加购性能差 |
| P1 | 支付方式接口统一 | 支付方式不一致 |
| P1 | Admin 用户管理接口 | admin-web 用户页 |
| P1 | Admin 商品管理接口 | admin-web 商品页 |
| P2 | Admin 仪表盘接口 | admin-web 首页 |
| P2 | 分页格式统一 | 代码一致性 |
| P3 | Admin Web 应用搭建 | 长期规划 |

---

## 七、联调联系方式

- **前端仓库**：`/Users/linsuwei/code/Work/Temporarily-project/mei-mart-app/apps/client-app`
- **后端仓库**：`/Users/linsuwei/code/Work/MeiMart/apps/api`
- **数据库**：PostgreSQL，容器 `meimart-pg`，库名 `meimart`
- **前端开发服务器**：`http://localhost:8082`
- **后端开发服务器**：`http://localhost:3000`

---

## 八、验证命令

修复后可用以下命令快速验证：

```bash
# 1. 验证 createOrder 响应包含 items
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/common/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"role":"customer","deviceType":"client_app"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
SKU_ID=$(docker exec meimart-pg psql -U postgres -d meimart -tAc "SELECT id FROM skus WHERE status='ACTIVE' LIMIT 1")
ADDR_ID=$(docker exec meimart-pg psql -U postgres -d meimart -tAc "SELECT id FROM addresses WHERE lat IS NOT NULL LIMIT 1")
curl -s -X POST http://localhost:3000/api/v1/client/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "{\"items\":[{\"skuId\":\"$SKU_ID\",\"quantity\":1}],\"addressId\":\"$ADDR_ID\",\"paymentMethod\":\"COD\"}" \
  | python3 -m json.tool

# 2. 验证商品列表返回 defaultSkuId
curl -s "http://localhost:3000/api/v1/client/products?limit=1" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 3. 验证 admin 订单接口
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/common/auth/mock-login \
  -H "Content-Type: application/json" \
  -d '{"role":"super_admin","deviceType":"admin_web"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
curl -s "http://localhost:3000/api/v1/admin/orders?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
```

---

## 九、2026-10-03 新增需求（三端优化审查复验后的遗留）

> 来源：前端双端代码审查修复（44 条）完成后的**独立复验**（回代码 + 实跑测试 + curl 实测 + **开后端仓逐条取证**）。
> 复验结论：审查问题已实质闭环；本节只登记**仍需后端配合**的项，按优先级排列。
> 前端侧对应文档：Obsidian `_inbox/04-后端记录/三端优化更新/全栈代码审查/复验报告-修复完成度核查-20261003.md`。

### 九.0 已回后端仓核实、**无需再处理**（确认即可）

| 项 | 后端证据 |
|---|---|
| pay-mock 生产白名单 + 403 | ✅ `src/modules/rider/deposit.controller.ts:77-89`（`NODE_ENV==='production' \|\| PAY_MOCK_ENABLED!=='true'` → 403 `E-DEPOSIT-008`，提交 `0592c2f`） |
| 骑手任务取证 evidence 契约 | ✅ 提交 `4e4d946`（前端接线 `69dcb56`） |
| `/common/geo/reverse` 反查代理 | ✅ 提交 `5087325`（前端已撤 Nominatim 直连 `b3ee0ec`）；curl 实测 **200** |
| `/client/products/{id}/detail` 聚合端点 | ✅ curl 实测 **200** |
| 缴纳点停用过滤 | ✅ `src/modules/rider/deposit.service.ts:325-331` `listEnabledLocations()` 已 `where:{enabled:true}` |

### 九.1 【P0·骑手资金】W6 骑手收入/提现端点缺失

**问题**：后端**没有骑手自助的收入/流水/提现端点**，仅存在 `POST/GET /api/v1/admin/settle/withdrawals`（super_admin 代录）。
**当前后端路由实测**：`api/v1/rider/deposit/*`（requests / pay-mock / status / locations / tiers）存在；**`rider/earnings`、`rider/withdrawals`、`client/withdrawals` 均不存在**。

**前端现状（已做兜底，等后端放开）**：
- `apps/rider-app/src/services/earnings.ts:12` `const FORCE_MOCK = true;`
- `:18` `isEarningsForcedMock = !isMockMode && FORCE_MOCK` → real 模式下钱包页/提现页**只读降级**（假数字不上屏，见 `app/(main)/earnings.tsx:148`、`app/earnings/withdraw.tsx:108`）
- 后端一排期，前端把 `FORCE_MOCK` 改 `false` 即自动恢复真实数据，**无需改页面**。

**期望端点（建议契约，供后端参考）**：
```
GET  /api/v1/rider/earnings/summary        → { availableBalance, todayEarnings, weeklyEarnings, monthlyEarnings }（金额分）
GET  /api/v1/rider/earnings/transactions   → [{ id, orderId?, amount, type, createdAt, description }]（分页）
POST /api/v1/rider/withdrawals             → 提现申请（body: { amount, method }；强制 requesterId = req.user.sub）
GET  /api/v1/rider/withdrawals             → 提现记录
```
> 注意：`withdraw.controller.ts` 注释已提到「`/client/withdrawals` — customer/rider 自申请，强制 requesterId = req.user.sub」的设想，但**路由尚未实现**，可据此对齐。

**验收命令（实现后）**：
```bash
RTOKEN=$(curl -s -X POST http://localhost:3000/api/v1/common/auth/mock-login \
  -H "Content-Type: application/json" -d '{"role":"rider","deviceType":"rider_app"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
curl -s -o /dev/null -w "earnings.summary=%{http_code}\n" \
  http://localhost:3000/api/v1/rider/earnings/summary -H "Authorization: Bearer $RTOKEN"   # 期望 200（当前 404）
```

### 九.2 【P1·多语数据】商品/分类多语 JSON 缺 `tet` 键 + 键集口径统一

**问题**：`GET /api/v1/client/products` 返回的 `name` **只有 `{en, id, pt, zh}`，缺 `tet`（德顿语）**：

```json
"name": { "en": "Red Nail Polish", "id": "Cat Kuku Merah", "pt": "Esmalte Vermelho", "zh": "红色指甲油" }
```

**影响**：前端 i18n 已完成「文案下沉单源」（`@meimart/i18n-core`，`localize()` 回退链 locale→en→zh→首值），但**数据侧没有 tet 译文** → **tet 用户商品名/分类名仍回退英文**。前端无法自行修复。

**要求**：
1. 商品 / 分类（及任何返回多语 JSON 的端点）**补齐 `tet` 译文**。
2. **统一键集口径**：两端前端 `LocalizableText` 定义为 **`zh / en / tet / pt`（4 语）**，而响应含 `id`（印尼语，骑手端 `settings` 已启用 Bahasa Indonesia）。请后端明确：多语 JSON 的**权威键集**是 `{en, id, pt, tet, zh}` 五语，还是四语？若含 `id`，前端需同步扩 `LocalizableText` 并处理四语/五语不一致（否则 `id` 用户看到回落）。

**验收命令**：
```bash
curl -s "http://localhost:3000/api/v1/client/products?limit=1" \
  | python3 -c "import sys,json;d=json.load(sys.stdin)['data']['items'][0];print(sorted(d['name'].keys()))"
# 期望含 'tet'；口径统一后与前端 LocalizableText 一致
```

### 九.3 【P1·多语检索】search 多语化（前端已挂账，等后端）

**问题**：后端搜索联想/热搜按 **locale** 返回内容，导致前端 queryKey 必须携带 locale：
- `apps/client-app/src/services/queries/useSearchSuggest.ts:29` `queryKey: ['search-suggest', locale, prefix]`、`:53` 同类
- `apps/client-app/src/services/searchSuggest.ts:32` 仍用 `getCurrentLocale()`

**要求（二选一，需后端表态）**：
- **方案 A（推荐）**：`/client/search/suggest`、`/client/search/products` 支持**多语命中的统一检索**（服务端跨语言匹配商品名），前端去掉 queryKey 里的 locale（配合缓存失效策略）。
- **方案 B**：维持按 locale 检索，则**视为产品设计**，前端保持现状并登记为「locale 例外豁免」（不再作为缺陷）。

**验收**：前端 `useSearchSuggest` 的 queryKey 去掉 locale 后，切语言仍能命中同一商品（方案 A）。

### 九.4 【P2·可靠性】WS 长宕自愈语义（D7）

**问题**：两端 WS 重连参数已统一到前端单点 `packages/api-core/src/wsDefaults.ts`（attempts 10 / delay 1s / max 30s），但注释自述**数值待校准**：
> 「待后端 D7 长宕语义结论校准：attempts 耗尽后由调用方生命周期重建通道；长宕期间是否需要 service-worker 级重连、退避上限是否匹配后端网关重启窗口，均待 D7 结论后回填。」

**要求后端/运维给出**：网关重启窗口时长、长宕（>10min）期间期望的前端行为语义（是否需要 `recover` 式重连 / 服务端 session 保留时长）。前端据此**只改 `wsDefaults.ts` 的数字**。

### 九.5 【P2·错误码】geo 系 429 错误码嵌套读取（G8）

**问题**：`E-COMMON-004`（超频）在网关/过滤器嵌套层的读取路径待确认，导致前端 `toApiErrorText` 的 429 文案可能落空（前端已兜底映射通用「操作频繁」）。
**要求**：确认 429 响应的错误信封位置（`error.code` vs 顶层 `code`）与 `E-COMMON-004` 是否稳定下发；如不一致请统一。

### 九.6 【产品·非后端】真实收银台 UI 立项（C-6）

渠道范围（微信/银行/本地 PSP…）需**产品拍板**，前置是支付网关后端接入。前端已就绪：`payment.ts` 的 `ICON_SYMBOL_BY_CODE` 已预置 `wechat / paypal / stripe / alipay / local-psp` 等渠道映射，后端开通即显示。

---

### 九.7 本节优先级总表

| 优先级 | 项 | 归属 | 阻塞对象 |
|---|---|---|---|
| **P0** | 九.1 W6 骑手收入/提现端点 | 后端 | 骑手端钱包**真实可用**（当前为只读降级） |
| **P1** | 九.2 商品/分类补 `tet` + 键集口径 | 后端 | **tet 用户商品/分类名可读性** |
| **P1** | 九.3 search 多语化 | 后端 + 前端跟着去 key | 切语言后搜索一致性 |
| P2 | 九.4 WS 长宕语义（D7） | 后端/运维 | 前端 `wsDefaults.ts` 参数校准 |
| P2 | 九.5 geo 429 错误码 | 后端 | 前端超频文案 |
| 产品 | 九.6 收银台 UI 立项 | 产品 + 后端 | 真实支付渠道上线 |

