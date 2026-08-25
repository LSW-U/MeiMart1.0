# i18n 多语言提取

## 何时触发

当你在**写或修改包含用户可见文案的组件/页面**时。

> 所有用户能看到的文字都必须提取到 i18n，不能直接写中文字符串。

## 项目语言配置

| 语言 | locale | 文件 | 状态 |
|------|--------|------|------|
| 中文（默认） | `zh` | `src/locales/zh.json` | ✅ 主力 |
| 英文 | `en` | `src/locales/en.json` | ✅ 主力 |
| 德顿语 | `tet` | `src/locales/tet.json` | 🔲 空壳（预留） |

## 基本用法

### 1. 在组件中使用

```typescript
import { useTranslation } from 'react-i18next';

function HomePage() {
  const { t } = useTranslation();

  return (
    <View>
      <Text>{t('home.welcome')}</Text>
      <Text>{t('home.greeting', { name: userName })}</Text>
    </View>
  );
}
```

### 2. 添加翻译

```json
// src/locales/zh.json
{
  "home": {
    "welcome": "欢迎来到 MeiMart",
    "greeting": "你好，{{name}}"
  }
}

// src/locales/en.json
{
  "home": {
    "welcome": "Welcome to MeiMart",
    "greeting": "Hello, {{name}}"
  }
}
```

### 3. 德顿语空壳

```json
// src/locales/tet.json — 只建结构，值留空或用中文占位
{
  "home": {
    "welcome": "",
    "greeting": ""
  }
}
```

## 硬编码检查

```bash
# 检查组件中是否有未提取的中文硬编码
grep -rn "[\x{4e00}-\x{9fff}]" app/ src/components/ src/screens/ \
  --include="*.tsx" --include="*.ts" \
  | grep -v "locales/\|\.test\.\|//\|/\*\|console\.\|import " 2>/dev/null
```

有输出 → 需要提取到 i18n。

例外（可以硬编码）：
- `console.log` / `console.error` 中的调试信息
- 代码注释
- 测试文件中的断言文本
- `accessibilityLabel` 的值（但建议也提取）

## Key 命名规范

```
<模块>.<子模块>.<具体文案>
```

| ✅ 好 | ❌ 坏 | 原因 |
|-------|-------|------|
| `cart.empty.title` | `cart_empty_title` | 层级结构更清晰 |
| `product.detail.addToCart` | `addToCart` | 避免命名冲突 |
| `common.confirm` | `confirm` | 全局通用放 common |
| `error.network.timeout` | `err1` | 有语义 |

### 常用模块前缀

- `common.*` — 通用文案（确认、取消、确定、加载中等）
- `home.*` — 首页
- `product.*` — 商品相关
- `cart.*` — 购物车
- `order.*` — 订单
- `address.*` — 地址
- `auth.*` — 登录/注册
- `profile.*` — 个人中心
- `error.*` — 错误提示
- `validation.*` — 表单验证

## 带变量的翻译

```json
{
  "cart.itemCount": "购物车（{{count}}件）",
  "order.estimatedDelivery": "预计 {{date}} 送达",
  "product.price": "¥{{amount}}"
}
```

```typescript
t('cart.itemCount', { count: 3 })  // "购物车（3件）"
```

## 复数处理

```json
{
  "cart": {
    "items_one": "{{count}} item",
    "items_other": "{{count}} items"
  }
}
```

```typescript
t('cart.items', { count: items.length })
// en: 1 item / 3 items
// zh: 不区分复数，直接用 items_other
```

## 切换语言

```typescript
import { useTranslation } from 'react-i18next';

function LanguageSelectPage() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    AsyncStorage.setItem('user-language', lng);
  };

  return (
    <View>
      <Button title="中文" onPress={() => changeLanguage('zh')} />
      <Button title="English" onPress={() => changeLanguage('en')} />
      <Button title="Tetum" onPress={() => changeLanguage('tet')} />
    </View>
  );
}
```

## RTL 支持（预留）

虽然目前不需要 RTL，但 key 结构设计时注意不要硬编码方向相关词语：
- ❌ `steps.leftButton`
- ✅ `steps.primaryButton`

## 不要做的事

- ❌ 在 JSX 中直接写 `<Text>加入购物车</Text>`
- ❌ 把所有文案堆在一个扁平的 `common` 下（应该按模块分）
- ❌ 只更新 `zh.json` 忘了同步 `en.json`
- ❌ 用 Google Translate 自动翻译德顿语（预留空壳就好，等本地译员）
