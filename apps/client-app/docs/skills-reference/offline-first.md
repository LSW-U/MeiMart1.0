# 离线优先模式（东帝汶弱网环境）

## 何时触发

当你在**写涉及网络请求的 hook、页面或功能**时。

> 东帝汶的网络环境是常态弱网。所有数据页面必须假设"随时可能断网"。

## React Query 离线配置

所有 useQuery / useMutation 必须设置 `networkMode: 'offlineFirst'`：

```typescript
// ✅ 正确
useQuery({
  queryKey: ['products'],
  queryFn: () => productsApi.list(),
  networkMode: 'offlineFirst',  // 离线时返回缓存数据，不报错
  staleTime: 60 * 1000,
});

// ❌ 缺少 networkMode → 断网时直接报错，用户看到空白
useQuery({
  queryKey: ['products'],
  queryFn: () => productsApi.list(),
});
```

### networkMode 三种模式对比

| 模式 | 离线时行为 | 适用场景 |
|------|-----------|---------|
| `online`（默认） | 暂停请求，报错 | 不适合本项目 |
| `always` | 依然尝试请求，失败报错 | 不适合 |
| `offlineFirst` ✅ | **优先返回缓存**，后台静默重试 | **本项目统一用这个** |

## 三态处理（必须）

所有数据页面必须处理 loading / error / stale 三态：

```typescript
function ProductListPage() {
  const { data, isLoading, isError, isStale } = useProducts();

  // 1. Loading — 首次加载，无缓存
  if (isLoading) return <ProductListSkeleton />;

  // 2. Error — 请求失败且无缓存
  if (isError && !data) return <ErrorState onRetry={() => refetch()} />;

  // 3. 正常渲染（可能有数据 + stale 标记）
  return (
    <View>
      {isStale && data && (
        <StaleBanner text="显示的是缓存数据，正在更新..." />
      )}
      <ProductList products={data} />
    </View>
  );
}
```

## 关键操作的离线策略

### 可以离线（乐观更新 + 队列）

购物车操作、收藏切换 — 用 mutation 乐观更新（详见 mutation-completeness skill）。

```typescript
// 购物车即使断网也能操作
const mutation = useToggleCartItem();
// 用户点击 → 立即更新 UI → 后台自动重试
```

### 不可以离线（必须阻止 + 提示）

支付、提交评价、确认收货 — 这些操作如果离线了**不能静默失败**：

```typescript
async function handlePayment() {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    // ✅ 明确阻止并提示
    Alert.alert(
      t('payment.offline.title'),
      t('payment.offline.message'),
      [{ text: t('common.ok') }],
    );
    return;
  }
  // 有网才继续
  navigation.navigate('Payment');
}
```

### 离线操作队列（高级）

如果需要离线操作排队、恢复后自动提交：

```typescript
// src/services/offline-queue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = 'offline-queue';

// 入队
export async function enqueueAction(action: QueuedAction) {
  const queue = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY) || '[]');
  queue.push({ ...action, timestamp: Date.now() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// 监听网络恢复
NetInfo.addEventListener((state) => {
  if (state.isConnected) {
    flushQueue();
  }
});

async function flushQueue() {
  const queue = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY) || '[]');
  for (const action of queue) {
    try { await executeAction(action); }
    catch (e) { /* 记录失败，不中断队列 */ }
  }
  await AsyncStorage.removeItem(QUEUE_KEY);
}
```

## AsyncStorage 持久化

React Query 状态持久化到 AsyncStorage：

```typescript
// src/providers/AppProviders.tsx
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'meimart-cache',
  throttleTime: 3000,
});

persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
});
```

## 图片离线缓存

```typescript
// expo-image 自带磁盘缓存
import { Image } from 'expo-image';

<Image
  source={{ uri: product.imageUrl }}
  cachePolicy="memory-disk"  // ✅ 内存 + 磁盘缓存
  placeholder={blurhash}
  contentFit="cover"
/>
```

## 不要做的事

- ❌ 断网时直接 `Alert.alert('网络错误')` 然后什么都不做 — 应该展示缓存
- ❌ 所有操作都用 `try/catch` 吞掉错误 — 关键操作必须告知用户
- ❌ 用 `fetch` 直接请求 — 应该通过 React Query 管理缓存和重试
- ❌ 把 loading 状态写成 `if (loading) return <ActivityIndicator/>` — 应该用骨架屏（Skeleton）
