# i18n 实现策略

> 建立：2026-06-20
> 触发场景：商品详情页 / 购物车 / 订单等场景的商品名需要按当前 locale 渲染

## 两套并行的 i18n 系统

本项目的国际化分两个层次，**不要混淆**：

### 层次 1：UI 文案（react-i18next）

适用于"代码里写死的字符串"——按钮文字、标题、错误提示、a11y label 等。

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <Text>{t('cart.checkout')}</Text>;
}
```

- 配置：`src/i18n/index.ts`
- 翻译文件：`locales/{zh,en,tet}.json`
- key 命名：`namespace.field`（如 `cart.checkout`、`profile.title`）
- 切语言：`changeLocale(locale)`（同步更新 zustand store + AsyncStorage + i18next）

### 层次 2：动态数据多语言字段（LocalizableText + useLocalizer）

适用于"从 mockDb / API 来的数据"——商品名、描述等。这些字符串不在 JSON 翻译文件里，而是数据本身的字段。

```ts
// 类型定义（src/types/index.ts）
export type LocalizableText = Record<AppLocale, string>;

export interface Product {
  id: string;
  name: LocalizableText; // { zh, en, tet }
  description?: LocalizableText;
  // ...
}
```

```tsx
import { useLocalizer } from '@/i18n';

function ProductName({ product }: { product: Product }) {
  const localize = useLocalizer();
  return <Text>{localize(product.name)}</Text>;
}
```

- `useLocalizer` 内部用 `useSyncExternalStore` 订阅 i18next 的 `languageChanged` 事件
- 切语言时自动重渲染，**不需要 refetch 数据**
- i18next 未初始化时（如测试场景）fallback 到 `DEFAULT_LOCALE`（en）
- 在非组件代码（services / utils）里用 `localize(text, getCurrentLocale())` 函数形式

## mock 数据结构约定

`mocks/data/*.json` 里凡是用户可见的字段（name / description / title 等）都用对象形式：

```json
{
  "id": "p001",
  "name": {
    "zh": "新鲜红富士苹果",
    "en": "Fresh Red Fuji Apple",
    "tet": "Maçã Fuji Vermelha Frescu"
  },
  "description": {
    "zh": "山东烟台直供...",
    "en": "Sourced from Yantai...",
    "tet": ""
  }
}
```

Tetun 字段允许留空，i18next fallback 自动用 en。

## 决策依据

为什么不用单一 i18next？

1. **数据 vs 代码分离**：商品名是数据，不属于代码。混在一起会让 JSON 翻译文件膨胀（10+ 商品 × 3 语言 = 30+ key 仅商品名一项）。
2. **API 友好**：真实后端返回的 product 数据结构天然是 `{ zh, en, tet }` 或 `name_zh / name_en / name_tet`。前端类型对齐后端，不需要中间转换。
3. **类型安全**：`LocalizableText = Record<AppLocale, string>` 强制每个字段必须有所有语言，避免漏译。

## 测试场景处理

测试里 mock Product 时，必须用对象形式 name：

```ts
const product: Product = {
  id: 'p1',
  name: { zh: '苹果', en: 'Apple', tet: 'Maçã' },
  // ...
};
```

测试环境 i18next 通常未初始化，`useLocalizer` 会 fallback 到 en，断言用英文字符串即可：

```ts
expect(getByText('Apple')).toBeTruthy();
```

## 何时该用哪套

| 场景                                   | 用哪个                                                        |
| -------------------------------------- | ------------------------------------------------------------- |
| 按钮文字、标题、tab 名                 | `useTranslation` + `t('key')`                                 |
| Alert 弹窗文案                         | `useTranslation` + `t('key')`                                 |
| a11y label                             | `useTranslation` + `t('key')`                                 |
| 商品名 / 描述                          | `useLocalizer` + `localize(product.name)`                     |
| 错误提示「Failed to load X」           | `useTranslation` + `t('errors.X')`                            |
| 数据驱动的选项标签（订单状态、分类名） | 两者皆可：数组里存 `labelKey` 字段，渲染时 `t(item.labelKey)` |

## 已接入的页面

- ✅ `app/(main)/profile.tsx` — ORDER_ENTRIES / FUNCTION_ITEMS 用 `labelKey`
- ✅ `app/(main)/orders.tsx` — TABS 用 `labelKey`
- ✅ `app/(main)/categories.tsx` — SIDEBAR_CATEGORIES / SUB_CATEGORIES 用 `labelKey`
- ✅ `app/(main)/home.tsx` — SHORTCUTS 用 `labelKey/titleKey`，渲染时 map 成 label/title
- ✅ `app/(main)/cart.tsx` — Alert / 标题 / a11y 全接入
- ✅ 商品名多语言：ProductCard / CartItemRow / OrderCard / product detail / order detail / order checkout / categories / home / search
- ✅ services 层：`products.ts search()` 用 `getCurrentLocale()` 取对应字段匹配

## 还没接入的页面（后续工作）

- `app/product/list.tsx` — Top 3 / Rest List 商品名仍是硬编码英文
- `app/order/tracking.tsx` — OrderItemRow 用的是 mock 数据，未走 i18n
- `app/coupons.tsx` / `app/favorites.tsx` 等已接入 `t()` 但商品名是否走 `localize` 待审计
