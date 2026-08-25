# Mutation 完整性检查

## 何时触发

当你在**写或修改任何包含 `useMutation` 的 hook** 时（`src/services/queries/use*.ts`）。

## 核心规则：三件套

每个 `useMutation` **必须**实现以下三个回调，除非是「纯创建且不需要立即更新列表」的异步操作（如发送验证码、提交评价）：

| 回调 | 作用 | 缺失后果 |
|------|------|---------|
| `onMutate` | 乐观更新——立即修改缓存，UI 瞬间响应 | 用户点击后 UI 无反应，感觉卡顿 |
| `onError` | 回滚——请求失败时恢复 `onMutate` 前的状态 | 失败后界面显示错误数据 |
| `onSettled` | 刷新——请求完成后从服务端拉最新数据 | 本地和服务器数据不一致 |

### 判断标准

> **用户点击后期望立即视觉反馈的写操作 → 必须有 `onMutate`**

典型需要乐观更新的操作：
- 购物车：加购/减购/删除/切换选中
- 地址：增/删/改/设默认
- 收藏：收藏/取消收藏
- 订单：取消/确认收货

可以不乐观更新的操作：
- 发送验证码（异步，用户等 SMS）
- 提交评价（提交后跳转）
- 登录/注册（等服务器确认）

## 黄金模板（来自 MeiMart useCart.ts）

```typescript
export function useToggleCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId }: { itemId: string }) => cartApi.toggleItem(itemId),
    onMutate: async ({ itemId }) => {
      // 1. 取消正在进行的查询，防止覆盖乐观更新
      await qc.cancelQueries({ queryKey: CART_QUERY_KEY });
      // 2. 保存当前状态用于回滚
      const previous = qc.getQueryData<Cart>(CART_QUERY_KEY);
      // 3. 乐观修改缓存
      qc.setQueryData<Cart>(CART_QUERY_KEY, (old) => {
        if (!old) return old;
        const items = old.items.map((i) =>
          i.id === itemId ? { ...i, selected: !i.selected } : i,
        );
        return recomputeTotals(old, items);
      });
      // 4. 返回 context 供 onError 回滚
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(CART_QUERY_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CART_QUERY_KEY }),
  });
}
```

## 常见错误模式（必须避免）

```typescript
// ❌ 只有 onSuccess，没有 onMutate → 用户点击后等服务器响应才更新
useMutation({
  mutationFn: cartApi.removeItem,
  onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
});

// ❌ onMutate 忘了 return context → onError 无法回滚
onMutate: async ({ itemId }) => {
  await qc.cancelQueries({ queryKey: CART_QUERY_KEY });
  qc.setQueryData(CART_QUERY_KEY, (old) => { /* ... */ });
  // 没有 return { previous }！
},

// ❌ 没有 cancelQueries → 并发请求可能覆盖乐观更新
onMutate: async ({ itemId }) => {
  const previous = qc.getQueryData(CART_QUERY_KEY);
  qc.setQueryData(CART_QUERY_KEY, (old) => { /* ... */ });
  return { previous };
  // 缺了 await qc.cancelQueries({ queryKey: CART_QUERY_KEY });
},
```

## Commit 前必跑的检查脚本

```bash
# 检查所有 mutation hook 的 onMutate 覆盖率
for f in src/services/queries/use*.ts; do
  m=$(grep -c "useMutation" "$f" 2>/dev/null || echo 0)
  o=$(grep -c "onMutate" "$f" 2>/dev/null || echo 0)
  [ "$m" -gt "$o" ] && echo "❌ $f: $m mutations but only $o onMutate" && exit 1
done
echo "✅ onMutate 覆盖率达标"
```

有 ❌ 输出 → **Task 不算完成，禁止 commit。**
