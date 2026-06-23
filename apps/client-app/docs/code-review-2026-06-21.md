# 📋 MeiMart 客户端 App 前端代码审查报告

> **审查对象**:`/Users/linsuwei/code/Work/Temporarily-project/mei-mart-app`
> **审查日期**:2026-06-21
> **审查范围**:React Native + Expo(SDK 56) + Expo Router + React Query + Zustand
> **代码规模**:~25,000 行 TS/TSX · 245 个 src 文件 + 40 个 app 路由 · 56 个测试文件
> **审查依据**:`CLAUDE.md` 项目指令(密码策略、i18n、Intl、SecureStore、PostGIS、orderNo 等)

---

## 总体印象

整体架构 **非常专业**:React Query 的乐观更新、Sentry 脱敏、SecureStore、Token 刷新队列、Weak Network 降级、Cultural 组件设计 — 都达到了生产级水准。组件三件套(`.tsx/.types.ts/.test.tsx/index.ts`)和 theme 系统(`colors/typography/spacing/shadows/gradients`)也是少见的规范。

但 **9 个阻塞项** 必须在合并/上线前修复,集中在三个区域:**临时绕过的鉴权 gate**、**与 CLAUDE.md 不一致的安全规则**、**写死的业务关键数据**。另外有大量硬编码英文文案和手写货币格式化,违反了 CLAUDE.md 的明确禁令。

---

## 🏗️ 架构与结构

### ✅ 设计良好的部分

- **目录组织**:`src/components/{ui, business, cultural, feedback, layout}` 五层切分清晰,业务/通用/装饰/反馈解耦得当
- **组件三件套**:每个组件配 `.types.ts` + `.test.tsx` + `index.ts` 桶导出,导入路径干净
- **Theme 系统**:Light/Dark 双套 token,`typography/spacing/shadowPresets/gradients` 完整,与 Material 风格对齐
- **Query 层抽象**:`services/queries/useXxx.ts` 集中封装 React Query,页面只调用 hook
- **Mock 切换**:`isMockMode` + `mockResponse(ms)` 一行切换 dev/real,接口预留规范
- **Cultural 组件**:`TaisPattern / UmaLulikSkyline / TaisDivider / DiamondPattern / DecorativeCorner` 体现东帝汶本地化设计,这是项目差异化亮点

### ⚠️ 架构层面的小问题

1. **三套状态持久化机制并存**:`useAuthStore` (zustand+persist)、`useAppStore` (zustand+persist)、`ThemeProvider`(裸 AsyncStorage)、`i18n`(裸 AsyncStorage)、`react-query-persist-client`(AsyncStorage)。同一份 locale 在 `useAppStore` 和 `meimart.locale` 两处存;同一份 themeMode 在 `useAppStore` 和 `@meimart/theme-mode` 两处存。统一到 zustand store 能减少不一致风险。
2. **`App.tsx` 是死代码**:默认 expo 模板,真正入口是 `index.ts → 'expo-router/entry'`。应删除 `App.tsx` 避免误解。
3. **`useNetwork.ts` 同时定义 `useNetworkQuality` 和 `useNetwork`**,后者只是前者别名 — 二选一。

---

## 🔴 阻塞项(必须修复)

### 1. 临时绕过的鉴权 Gate

**位置**:`app/_layout.tsx:6-9`

```ts
function RootAuthGate() {
  // TEMP: bypass auth for web preview
  const isAuthenticated = true;  // 🔴 写死!
  const segments = useSegments();
  useEffect(() => {
    if (isAuthenticated) return;  // 永远 return,鉴权逻辑完全失效
    ...
```

**问题**:任何未登录用户都能直接访问 `/(main)/*`、`/order/*`、`/address/*`、`/profile/*` 等所有受保护路由。注释 "TEMP: bypass auth for web preview" 暗示这是临时绕过,但忘了恢复。
**修复**:用 `useAuthStore((s) => s.isAuthenticated)` 替换硬编码,并确保 persisted store 在首屏前 hydration 完成(见阻塞项 #3)。

### 2. 密码强度不符合 CLAUDE.md 安全规则

**位置**:

- `src/forms/schemas/auth.ts:18` `passwordSchema.min(6)`
- `src/forms/schemas/auth.ts:16-19`(registerSchema / resetPasswordSchema 复用同一 schema)
- `src/utils/validate.ts:13` `isValidPassword: password.length >= 6`

**CLAUDE.md 明文规定**:"密码强度 ≥ 8 位 + 字母+数字"。
**修复**:

```ts
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password too long')
  .regex(/[a-zA-Z]/, 'Must contain letters')
  .regex(/\d/, 'Must contain numbers');
```

### 3. Token 双存储且 AsyncStorage 未排除

**位置**:`src/store/authStore.ts:13-27`

```ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({ ... }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // 🔴 没有 partialize,token + refreshToken 全量持久化到 AsyncStorage
    },
  ),
);
```

**问题**:

1. **AsyncStorage 不加密**,Token 落盘到不加密存储,违反 CLAUDE.md "敏感数据用 SecureStore"。
2. **与 `services/api.ts` 的 SecureStore 形成双写**,两边状态可能不一致(refresh token 时只更新 SecureStore + zustand in-memory,但 zustand persist 会再写一份 AsyncStorage,出现 race)。
   **修复**:`authStore` 只存 `userId / isAuthenticated`,不存 token。Token 唯一来源是 `tokenStorage`(SecureStore)。

```ts
partialize: (s) => ({ isAuthenticated: s.isAuthenticated }),
```

### 4. `usePagination` 的 `getNextPageParam` 完全失效

**位置**:`src/hooks/usePagination.ts:16`

```ts
getNextPageParam: (lastPage) => (lastPage.hasMore ? undefined : undefined),
```

**问题**:无论 `hasMore` 是 true 还是 false,都返回 `undefined`,意味着 **永远不会加载下一页**。无限滚动列表会卡在第 1 页。
**修复**:

```ts
getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
```

### 5. Logout 没调用后端,refreshToken 未拉黑

**位置**:`src/hooks/useAuth.ts:53-57`

```ts
const logout = useCallback(async () => {
  clearAuth(); // 仅清前端 state
  await tokenStorage.clear(); // 仅清本地存储
  router.replace('/(auth)/login');
}, [clearAuth]);
```

**CLAUDE.md 明文规定**:"logout 必传 refreshToken,服务端加 Redis 黑名单,refresh 立即失效"。
**修复**:在 `authApi` 增加 `logout(refreshToken)` 调用,logout hook 里先调后端再清本地:

```ts
const logout = useCallback(async () => {
  const refresh = await tokenStorage.getRefresh();
  try {
    await authApi.logout(refresh);
  } catch {}
  clearAuth();
  await tokenStorage.clear();
  router.replace('/(auth)/login');
}, [clearAuth]);
```

### 6. BottomNav 购物车数量硬编码为 3

**位置**:`src/components/layout/BottomNav/BottomNav.tsx:11-12`

```ts
// Mock cart count for demo
const cartCount = 3; // 🔴 写死
```

**问题**:无论用户购物车有多少商品,BottomNav 永远显示红点 "3"。这是 **用户感知最强** 的 bug — 直接影响所有 tab 页。
**修复**:

```ts
const { data: cart } = useCart();
const cartCount = cart?.totalItems ?? 0;
```

### 7. Checkout 跳转没接 `useCreateOrder`,下单链路根本未通

**位置**:`app/order/checkout.tsx:67-73`

```ts
const submit = () => {
  if (isOffline) {
    Alert.alert(t('checkout.offlineBlock'), t('checkout.offlineBlockDesc'));
    return;
  }
  router.push('/order/result'); // 🔴 直接跳转,没下单!
};
```

**问题**:`useCreateOrder` mutation 已写好(乐观更新非常规范),但 Checkout 页根本没调用,等于整个下单流程是空的。用户点 "Confirm & Pay" 直接跳到结果页,后端从未收到订单。
**修复**:

```ts
const createOrder = useCreateOrder();
const submit = async () => {
  if (isOffline) { ...return; }
  try {
    await createOrder.mutateAsync({ items: selectedItems, totalPrice: finalTotal });
    router.replace('/order/result');
  } catch (e) {
    Alert.alert(t('checkout.orderFailed'));
  }
};
```

### 8. `.env` 文件被 Git 跟踪

**位置**:项目根目录 `.env` 文件;`.gitignore` 只 ignore `.env*.local`、`.env.staging`、`.env.production`,**没有 ignore `.env`**。
**验证**:`git ls-files | grep '^\.env'` 输出 `.env`。
**问题**:虽然当前 `.env` 内容只有 `APP_ENV=development` + localhost URL 没有 secret,但 `.env` 进版本库是反模式 — 后续任何人往里塞 secret 都会直接泄漏。
**修复**:

1. 在 `.gitignore` 增加 `.env` 和 `.env.local`。
2. `git rm --cached .env`(保留本地文件)。
3. 提交一个 `.env.example` 模板。

### 9. `security.ts` 越狱检测是虚假实现

**位置**:`src/services/security.ts:42-65`

```ts
async function checkAndroidRoot(): Promise<boolean> {
  try {
    const suspects = [...];  // 写死路径,但 RN 无文件系统访问
    return suspects.length > 0 && Constants.executionContext === 'store';
    // 🔴 只要 executionContext === 'store' 就返回 true??逻辑反了
  } catch { return false; }
}
async function checkIosJailbreak(): Promise<boolean> {
  return false;  // 永远 false
}
```

**问题**:这段代码给了 **虚假的安全感**。`assessDeviceRisk()` 调用方以为有越狱检测,实际什么也没做,而且 `Constants.executionContext === 'store'` 的判断语义混乱(应该是相反 — store 才安全)。
**修复**:MVP 阶段直接删除整个 `security.ts`,或换成 `expo-application` + 第三方 jailbreak/root 检测库。**不要写永远返回 false 但命名像在检测的函数**。

---

## 🟡 建议项(应该修复)

### A. i18n 与本地化

#### A1. i18n 语言列表与 CLAUDE.md 不一致 ⚠️ 高优先级

**位置**:`src/i18n/index.ts:13`

```ts
export const SUPPORTED_LOCALES = ['zh', 'en', 'tet'] as const;
```

**CLAUDE.md 规定**:"4 语言 `en / id / zh / pt`,Tetum 留接口但翻译值空字符串" — 共 5 种。实际只有 3 种,缺 `id`(印尼语)和 `pt`(葡萄牙语,东帝汶官方语言之一)。
**修复**:补齐 `id` 和 `pt` 语言包(可先空翻译),并在 `language.tsx` 页面解锁。

#### A2. 默认 locale 不一致

- `src/i18n/index.ts:15` `DEFAULT_LOCALE = 'en'` ✅ 符合 CLAUDE.md
- `src/store/appStore.ts:30` `locale: 'zh'` 🔴 初始值用 zh
- `src/store/__tests__/appStore.test.ts:5` 测试断言初始值是 `'zh'`

**问题**:首次启动时 zustand 持久化的 `zh` 会覆盖 i18n 的 `DEFAULT_LOCALE = 'en'`,东帝汶用户首次打开是中文。
**修复**:`appStore.ts:30` 改为 `locale: 'en'`,同步更新测试。

#### A3. 大量 UI 文案硬编码(违反 CLAUDE.md 规则 #1 "严禁硬编码字符串")

**抽样清单**:

| 文件                                                      | 行号                                      | 硬编码内容                                                                                                                                                                                                                              |
| --------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(auth)/login.tsx`                                    | 51-53                                     | `"Welcome Back"` / `"Sign in to your account to start shopping"` / `"Sign In"`                                                                                                                                                          |
| `app/(auth)/login.tsx`                                    | 76-77                                     | `label="ACCOUNT OR MOBILE"` / `placeholder="Email or Phone Number"`                                                                                                                                                                     |
| `app/(auth)/login.tsx`                                    | 87                                        | `placeholder="123456"`                                                                                                                                                                                                                  |
| `app/(auth)/login.tsx`                                    | 42                                        | `'Sign in failed' / 'Please check your credentials'`                                                                                                                                                                                    |
| `app/(auth)/login.tsx`                                    | 59, 67, 101, 111, 125, 127                | "New to Mei Mart?"、"Register Account"、"Sign in with phone code"、"Forgot Password?"、"Terms of Service"、"Privacy Policy"                                                                                                             |
| `app/product/[id].tsx`                                    | 31, 34, 103, 113, 122, 132, 140, 148, 156 | "PRODUCT" / "REVIEWS" / "RECOMMENDED" / "DETAILS" / "FINE" / "MEDIUM" / "COARSE" / "Loading…" / "Product not found" / "Added to cart" / "Added to favorites" / "Removed from favorites" / "Check it out on MeiMart!" / "Write a review" |
| `app/product/[id].tsx`                                    | 47-67                                     | 两条英文 review mock 文本(Maria S. / Antonio L.)                                                                                                                                                                                        |
| `app/order/tracking.tsx`                                  | 258-259                                   | `$32.30` / `$1.50`(连数据都是字面量)                                                                                                                                                                                                    |
| `app/order/tracking.tsx`                                  | 465                                       | `"On the way"` 硬编码                                                                                                                                                                                                                   |
| `app/order/tracking.tsx`                                  | 111                                       | `title="Order Details"`                                                                                                                                                                                                                 |
| `app/order/tracking.tsx`                                  | 129, 135, 141, 143                        | "ORDER NUMBER"、"Placed May 12, 2024"、"Status: Processing"、"PROCESSING"                                                                                                                                                               |
| `src/components/feedback/OfflineBanner/OfflineBanner.tsx` | 13, 17, 24, 27, 42, 45                    | "You are offline"、"Some features may not work"、"Retry"、"Weak network connection"、"Weak network. Loading may be slower."                                                                                                             |
| `src/components/feedback/ErrorBoundary/ErrorBoundary.tsx` | 26                                        | `"Something went wrong"`                                                                                                                                                                                                                |
| `src/components/business/ProductCard/ProductCard.tsx`     | 82, 115, 108                              | `"Remove from favorites"` / `"Add to favorites"` / `"Add to Cart"` / `"sold"`                                                                                                                                                           |
| `src/forms/schemas/auth.ts`                               | 5-25                                      | 所有错误消息 `'Phone is required'` / `'Invalid phone number'` / `'Password must be at least 6 characters'` 等                                                                                                                           |

**修复策略**:全部改为 i18n key,例如 `t('auth.welcomeBack')` / `t('auth.signInFailed')` / `t('auth.mustAgreeTerms')`。zod schema 的错误消息可以用工厂函数注入 `t`:

```ts
export function makeLoginPasswordSchema(t: TFunction) {
  return z.object({
    account: z.string().min(1, t('auth.accountRequired')),
    password: z.string().min(8, t('auth.passwordTooShort')),
    ...
  });
}
```

#### A4. iOS 权限描述是中文

**位置**:`app.json:18-21`

```json
"NSCameraUsageDescription": "MeiMart 需要访问相机以上传商品图片和扫描二维码。",
"NSPhotoLibraryUsageDescription": "MeiMart 需要访问相册以上传头像和评价图片。",
```

**问题**:App 面向东帝汶用户,默认应是英文或葡萄牙文。中文权限描述在 App Store 审核可能被打回。
**修复**:改为英文,后续配合 iOS 本地化 `.xcstrings` 做多语言。

---

### B. 货币格式化违反 CLAUDE.md 规则 #1

**CLAUDE.md 明文规定**:"时间/货币/数字格式用 Intl API,**不要手写格式化**"。

#### B1. `utils/format.ts` 手写货币字典

**位置**:`src/utils/format.ts:1-13`

```ts
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  CNY: '¥',
  IDR: 'Rp',
  AUD: 'A$',
};
export function formatPrice(value: number, currency = 'USD', decimals = 2): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? '';
  return `${symbol}${safe.toFixed(decimals)}`; // 🔴 手写
}
```

**修复**:

```ts
export function formatPrice(value: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
```

#### B2. `PriceText.tsx` 重复实现一遍 formatPrice

**位置**:`src/components/ui/PriceText/PriceText.tsx:13-15`

```ts
function formatPrice(value: number, currency: string, decimals: number) {
  return `${currency}${value.toFixed(decimals)}`; // 🔴 重复造轮子 + 手写
}
```

**修复**:直接复用 `utils/format.ts` 的 `formatPrice`,删除本地实现。

#### B3. 多处页面绕过 PriceText 直接拼 `$xxx`

| 文件                                                  | 行号                              | 代码                                                      |
| ----------------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| `app/(main)/cart.tsx`                                 | 224, 280                          | `${rec.price.toFixed(2)}` / `-${discount.toFixed(2)}`     |
| `app/order/checkout.tsx`                              | 251, 264, 269, 276, 305, 321, 324 | 全部用 `${xxx.toFixed(2)}` 而非 `<PriceText>`             |
| `app/product/[id].tsx`                                | 148, 243, 247                     | `${product.price.toFixed(2)}` / Share message             |
| `app/order/tracking.tsx`                              | 258-259                           | 字面量 `$32.30` / `$1.50`                                 |
| `src/components/business/ProductCard/ProductCard.tsx` | 72                                | ``accessibilityLabel=`${name}, price ${product.price}` `` |

**修复**:统一用 `<PriceText value={...} currency="USD" />`,且 `accessibilityLabel` 也走 formatPrice。

#### B4. `formatDate` 默认 locale 'zh-CN'

**位置**:`src/utils/format.ts:21`

```ts
export function formatDate(iso: string, locale = 'zh-CN'): string {
```

**修复**:默认 `'en-US'`,运行时从 `useAppStore.getState().locale` 动态读取。

---

### C. React / React Native 特有

#### C1. `ThemeProvider` 的 `useMemo` deps 失效

**位置**:`src/theme/ThemeProvider.tsx:55-68`

```ts
const resolvedTheme = useMemo(() => ..., [mode, systemScheme]);
const colors = resolvedTheme === 'dark' ? darkColors : lightColors;  // 每次渲染新建引用
const value = useMemo<ThemeContextValue>(
  () => ({ colors, typography, spacing, mode, resolvedTheme, setMode }),
  [colors, mode, resolvedTheme],  // colors 每次变 → useMemo 永远重算
);
```

**修复**:把 `colors` 也用 useMemo 包,deps 只用 `[resolvedTheme]`:

```ts
const colors = useMemo<AppColors>(
  () => (resolvedTheme === 'dark' ? darkColors : lightColors),
  [resolvedTheme],
);
```

#### C2. 网络监听双重订阅

**位置**:

- `src/hooks/useNetwork.ts:20-44` `useNetworkQuality` 内部 `NetInfo.addEventListener`
- `src/services/offline/network.ts:8-41` `initNetworkListener` 内部又 `NetInfo.addEventListener`

两个监听都在更新 `useAppStore.setNetworkStatus`,重复工作 + 重复触发 setState。
**修复**:`useNetworkQuality` 改成订阅 `useAppStore.networkStatus`(已在 `initNetworkListener` 维护),不再自己 addEventListener。

#### C3. 大列表用 ScrollView + .map 而非 FlatList

**位置**:

- `app/(main)/cart.tsx:143-183` 购物车商品用 `<ScrollView>` + `cart.items.map(...)`
- `app/(main)/home.tsx:271-288, 300-342` 推荐商品和 buy-again 用 `<ScrollView horizontal>` + `.map()`
- `app/(main)/cart.tsx:195-238` 横滑推荐

**问题**:虽然购物车通常几十个 item 影响不大,但 `home.tsx` 的 buy-again/recommend 数据量增长时性能下降明显。
**修复**:用 `<FlatList horizontal>` 或 `<SectionList>` 替代,享受虚拟化。

#### C4. 图片未用 expo-image 也未指定 cachePolicy

**位置**:

- `app/(main)/home.tsx:13, 326` 用 RN 内置 `<Image>`
- `app/(main)/cart.tsx:13, 214` 用 RN 内置 `<Image>`
- `app/product/[id].tsx:11, 189-200` 用 RN 内置 `<Image>`,且 mock 中 3 张相同 uri 渲染 3 个 `<Image>` 实例
- `app/order/tracking.tsx:10, 189` 用 RN 内置 `<Image>`
- `src/components/business/ProductCard/ProductCard.tsx:2, 75` 用 RN 内置 `<Image>`

**问题**:`package.json` 已引入 `expo-image: 56.0.11`,但页面没用。expo-image 性能比 RN Image 高一个数量级(原生解码、内存/磁盘缓存、placeholder、transition)。
**修复**:全局替换为:

```tsx
import { Image } from 'expo-image';
<Image source={uri} style={...} contentFit="cover" transition={200} cachePolicy="memory-disk" />
```

#### C5. `Dimensions.get('window').width` 模块顶层求值

**位置**:`app/product/[id].tsx:29`

```ts
const SCREEN_WIDTH = Dimensions.get('window').width;
```

**问题**:模块加载时一次性求值,后续屏幕旋转/分屏/iPad 尺寸变化时不更新。
**修复**:

```ts
import { useWindowDimensions } from 'react-native';
// 组件内
const { width: screenWidth } = useWindowDimensions();
```

#### C6. `Toast.tsx` 缺动画且 useEffect 依赖 onHide 易抖动

**位置**:`src/components/feedback/Toast/Toast.tsx:28-33`

```ts
useEffect(() => {
  if (visible && duration > 0 && onHide) {
    const timer = setTimeout(onHide, duration);
    return () => clearTimeout(timer);
  }
}, [visible, duration, onHide]); // 🔴 父组件未 useCallback onHide 时,每次渲染重置 timer
```

**问题**:

1. 父组件传内联 `onHide` 会导致 toast 永远不消失(每次父渲染都重置定时器)。
2. 显示/隐藏直接挂载/卸载,没有 fade-in/out 动画。
   **修复**:`onHide` 用 `useEventCallback` 或文档明确要求 useCallback;渲染用 `Animated.timing(opacity, { duration: 200 })` 平滑过渡。

#### C7. AppProviders 的 initPersist 是 fire-and-forget

**位置**:`src/providers/AppProviders.tsx:52-63`

```ts
useEffect(() => {
  let mounted = true;
  void initI18n().then(() => {
    if (mounted) setI18nReady(true);
  });
  const unsubscribeNetwork = initNetworkListener();
  void initPersist(client); // 🔴 不 await,不阻塞首屏
  return () => {
    mounted = false;
    unsubscribeNetwork?.();
  };
}, [client]);

if (!i18nReady || !fontsLoaded) return null; // 只等 i18n + fonts,不等 persist
```

**问题**:React Query persist 是异步从 AsyncStorage 反序列化 cache。在首屏渲染时 cache 可能还没恢复完,queries 会先发网络请求再被覆盖,造成"加载两次"或"flash of empty state"。
**修复**:增加 `persistReady` 状态,在 `persistQueryClient().then()` 完成后再渲染 children。

---

### D. 类型安全

#### D1. jest.setup.ts 用 `any` 绕过类型

**位置**:`jest.setup.ts:10`

```ts
const Mock = ({ name, size, color, testID }: any) => ...
```

**修复**:为 mock 写正确的 Props 类型(`{ name?: string; size?: number; color?: string; testID?: string }`)。

#### D2. `usePagination` 的 `queryFn` 类型未传 `pageParam` 类型

**位置**:`src/hooks/usePagination.ts:14`

```ts
queryFn: ({ pageParam }) => queryFn(pageParam as number),
```

用 `as number` 强转。应让 `useInfiniteQuery<number, ...>` 显式声明 pageParam 类型。

---

### E. 用户体验

#### E1. `WeakNetworkBanner` 颜色语义错误

**位置**:`src/components/feedback/OfflineBanner/OfflineBanner.tsx:40-46`

```ts
style={[styles.banner, { backgroundColor: colors.semantic.warning }]}  // 黄色(警告)
...
<Text style={[textStyle('body-md'), { color: colors['on-error'] }]}>  // 🔴 on-error 红色
  Weak network. Loading may be slower.
</Text>
```

**问题**:警告色底用错误色文字,语义混乱,且对比度可能不达标。
**修复**:用 `colors['on-warning']` 或显式定义 warning 文字色。

#### E2. tracking.tsx 的所有数据都是写死 mock

**位置**:`app/order/tracking.tsx:40-98`

- `ORDER_ITEMS` 3 个写死 item + 写死 Google 缓存图 URL
- `COURIER = { name: 'João Pereira', phone: '+670 7712 3456', rating: 4.9 }`
- `TIMELINE` 3 个写死时间点

**问题**:这是 mock 阶段,但页面没接 `useOrder(id)` 拉真实数据(虽然 order detail API 也还是 mock)。CLAUDE.md 中提到 "Socket.IO WS 通道打通(骑手位置推送链路)" — 这个页面应是 WS 接入点。
**修复**:把 mock 数据迁移到 `mockDb.ts` 集中管理,UI 用 `useOrder(id)` 获取。后续接 WS 时只换数据源。

#### E3. product/[id].tsx 的 mock 评价 / 评分分布硬编码在组件里

**位置**:`app/product/[id].tsx:42-67`

```ts
const REVIEWS = [{ userName: 'Maria S.', rating: 5, content: '"Best coffee in Dili!..."' }];
const RATING_DISTRIBUTION = [{ stars: 5, percent: 85 }, ...];
const PAIRS_WELL_WITH_IDS = ['p003', 'p005', 'p008'];
const YOU_MAY_LIKE_IDS = ['p006', 'p009'];
```

**问题**:mock 数据应在 `services/mockDb.ts` 集中,而非散落在页面。这些数据将来要接 API,现在散落将增加迁移成本。

---

### F. 业务规则不符

#### F1. orderNo 格式不符合 CLAUDE.md

**位置**:`src/services/orders.ts:26`、`src/services/queries/useOrders.ts:36`

```ts
orderNo: `MM${Date.now()}`,  // 🔴 13 位时间戳
```

**CLAUDE.md 规定**:`MM + yyyyMMdd + warehouseId(2位) + 序号(4位) = 16 位`,例:`MM2026061901000234`。
**修复**:`orderNo` 应由后端生成,前端 mock 时按格式生成更接近真实的占位值。

---

### G. 其他

#### G1. AppProviders 中 `initI18n` 在 useEffect 内调用,但 `i18n` 模块在顶层 import

**位置**:`src/providers/AppProviders.tsx:19`

```ts
import { initI18n, default as i18n } from '@/i18n';
...
<I18nextProvider i18n={i18n}>{children}</I18nextProvider>  // 即使未 init 也传入
```

**问题**:`i18n` 在 `initI18n()` 调用前可能没初始化完(虽然 i18n 模块顶层 `import i18n from 'i18next'` 已实例化)。这里依赖 `i18nReady` 状态控制渲染,逻辑 OK 但容易踩坑。

#### G2. NetInfo 类型断言不安全

**位置**:`src/hooks/useNetwork.ts:25`、`src/services/offline/network.ts:15`

```ts
const details = (state as { details?: { effectiveType?: string } }).details ?? {};
```

应使用 NetInfo 提供的官方类型 `NetInfoStateDetails`,而不是 `as` 断言。

---

## 💭 小改进(锦上添花)

### M1. 内联硬编码颜色未通过 theme

抽样:`'#ffffff'` / `'#000000'` / `'#961813'` / `'#f0fdf4'` / `'rgba(141,112,108,0.3)'` / `'rgba(255,255,255,0.2)'` 等,散布在 home/cart/orders/tracking/product/profile 等 30+ 处。
**建议**:全部抽到 theme.ts 的 cultural/semantic 子树,例如:

```ts
cultural: { amber: '#xxx', primary: '#961813' },
surface: { overlay: 'rgba(255,255,255,0.2)' },
```

### M2. `useOfflineMutation` 似乎未被使用

全局 grep 找不到调用方,业务侧 mutation 都直接走 react-query optimistic update。
**建议**:删除或文档说明保留用途(可能预留给 cart 离线场景)。

### M3. e2e 测试只有 yaml 描述

**位置**:`e2e/*.yaml` 5 个文件,是 Maestro flow 描述格式,但 `package.json` 没有 maestro 依赖,CI 也没集成。
**建议**:补 `maestro` 配置或在 README 注明如何运行。

### M4. 缺脚本

`package.json` scripts 只有 `start/android/ios/web/lint/test/prepare`,建议补:

- `typecheck`:`tsc --noEmit`
- `test:coverage`:`jest --coverage`
- `test:watch`:`jest --watch`

### M5. CLAUDE.md 中的"30% 门槛"规则在多个页面文件顶部注释引用

页面文件里大量 `// 满足 CLAUDE.md 规则 #28 的 30% 门槛(实际 65%)` 注释,这些是开发期临时注释,稳定后可以删除以保持代码干净。

---

## ✅ 做得好的地方(主动肯定)

1. **React Query 乐观更新非常规范** — `useCart`、`useOrders`、`useAddress`、`useUser` 都完整实现了 `onMutate → onError 回滚 → onSettled 失效` 三件套,带 `cancelQueries` 防竞态。`useCreateOrder` 还处理了"临时 ID 替换为真实 ID"的场景,细节到位。
2. **Axios 401 refresh token 队列**(`services/api.ts:82-156`)— `refreshPromise` 单例 + `pendingQueue` 等待队列,典型的无竞态实现,生产可用。
3. **Sentry 配置脱敏完整**(`services/sentry.ts:21-38`)— `beforeBreadcrumb` 脱敏 `/auth/` 和 `password` URL 的 query,`beforeSend` 脱敏 Authorization header 和 extra.token,符合生产标准。
4. **`sanitizeLogPayload`**(`services/api.ts:72-80`)— axios request 拦截器对日志做敏感字段脱敏,这个小细节很专业。
5. **无障碍属性使用广泛** — `accessibilityRole` / `accessibilityLabel` / `accessibilityState` / `accessibilityHint` 在 Button/Input/Pressable/Tab/Toast 等组件里都标注了,这是大多数 RN 项目都忽略的。
6. **zod + react-hook-form 集成规范** — `FormInput` 通过 Controller 桥接,类型推导正确,泛型 `<T extends FieldValues>` 设计通用。
7. **Mock 模式抽象**(`isMockMode` + `mockResponse(delay)`)— 一行切换 dev/real,每个 service 方法的 `if (isMockMode) ... throw new Error('Real API not implemented')` 模式清晰。
8. **Cultural 组件是项目差异化亮点** — `TaisPattern`(东帝汶传统编织纹)、`UmaLulikSkyline`(传统房屋天际线)、`TaisDivider` 等让 UI 有强烈的地域识别度。
9. **weak-network 降级策略**(`useWeakNetworkUI`)— `shouldSkipNonEssential` / `shouldUseLowResImage` / `shouldDisableAnimation` 三个布尔位面,在弱网时跳过 Banner、低清图、关闭动画,考虑了真实移动场景。
10. **TypeScript strict + path alias** — `tsconfig.json` 启用 `strict: true`,`@/*` 路径别名一致。

---

## 📊 评分

| 维度              | 评分 (1-10) | 说明                                                                                                                              |
| ----------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **正确性**        | 6           | 阻塞项 #1/#4/#5/#6/#7 是功能正确性问题(鉴权失效、分页失效、logout 没拉黑、购物车数量假、下单没接 mutation),修复后可达 9           |
| **性能**          | 7           | React Query 用法优秀,但 ScrollView+map、未用 expo-image、ThemeProvider useMemo 失效等扣分                                         |
| **可维护性**      | 8           | 目录清晰、组件三件套规范、theme 完整。扣分在 mock 数据散落、双存储机制                                                            |
| **安全性**        | 4           | 密码 6 位 + token 双存储 + 鉴权绕过 + 虚假越狱检测 + .env 进库 — 安全方面有多个高危项                                             |
| **用户体验**      | 8           | 三态(loading/error/empty)完整,无障碍属性齐全,Weak Network 降级专业。扣分在 Toast 无动画、Banner 颜色语义错                        |
| **类型安全**      | 8           | strict 模式 + zod schema + 泛型 FormInput,只有少量 `any` 和 `as` 断言                                                             |
| **i18n / 本地化** | 5           | 框架接入完整(useLocalizer、useTranslation、SUPPORTED_LOCALES),但语言数不够 + 大量硬编码英文 + 货币手写格式化 + 默认 locale 不一致 |
| **测试覆盖**      | 7           | 56 个测试文件,覆盖 utils/store/hooks/components/queries,但没有页面级测试和 e2e 可执行                                             |

**综合**:7.0 / 10 — **架构与基础设施一流,但安全规则、i18n 完整性、业务关键链路有阻塞项需在合并前修复**。

---

## 🚀 修复优先级建议

### P0(本周必修,影响正确性/安全)

1. 阻塞项 #1 `_layout.tsx` 鉴权 gate
2. 阻塞项 #2 密码 ≥ 8 位 + 字母+数字
3. 阻塞项 #3 `authStore` 移除 token 持久化
4. 阻塞项 #5 logout 调用后端
5. 阻塞项 #6 BottomNav 接 `useCart`
6. 阻塞项 #7 Checkout 接 `useCreateOrder`
7. 阻塞项 #8 `.env` 出库 + 加 `.gitignore`

### P1(下个迭代,影响体验/规范)

8. 阻塞项 #4 `usePagination` 修分页
9. 阻塞项 #9 删除 `security.ts` 虚假检测
10. 建议项 A1 补 `id` 和 `pt` 语言包
11. 建议项 A3 批量替换硬编码英文 → i18n key
12. 建议项 B1-B4 全局用 `Intl.NumberFormat` 替换手写货币格式化
13. 建议项 C4 全局 `Image` → `expo-image`

### P2(技术债,有空再修)

14. 建议项 C1-C7 各种 React 优化
15. 建议项 E1-E3 UX 细节
16. 小改进 M1-M5

---

## 🎯 总结

这是一份 **架构成熟度远超 MVP 标准** 的代码,React Query / Sentry / SecureStore / Weak-Network / Cultural UI 都做到了生产级。但当前阶段 **9 个阻塞项** 集中暴露了三类问题:

1. **临时 hack 留在代码里**(鉴权 `isAuthenticated = true`、`cartCount = 3`、`security.ts` 占位函数)— 需要系统清理。
2. **业务关键链路未接通**(下单没调 mutation、logout 没调后端)— W2 启动前必修。
3. **CLAUDE.md 规则落地不彻底**(密码 6 位、i18n 缺 id/pt、货币手写格式化、文案硬编码)— 需要按规范补齐。

修复完 P0 + P1 后,这个项目可以放心进 W2 并行开发。

---

**审查人**:Claude Code · 前端代码审查员角色
**审查耗时**:~10 分钟(245 文件,~25K 行代码)
**报告文件**:`docs/code-review-2026-06-21.md`
