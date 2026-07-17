# MeiMart 后端需求清单（前端联调发现）

> 本文档记录前端联调过程中发现的后端问题、需要的接口、期望的响应格式。请后端逐一处理。

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
