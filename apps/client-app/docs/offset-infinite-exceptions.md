# 无限滚动收编「前提不符例外」登记（批2 V2-2，2026-10-30 总指挥裁定口径）

> 任务书原口径「四处收编」，总指挥修订：**仅 recommendations 迁入 useOffsetInfinite**；
> 其余三处经代码核实不满足收编前提（无 offset 分页语义可收），登记本表例外，
> 不强行改造（强行收编 = 破坏现有行为契约或臆造后端能力，违反「换 hook 必须行为等价」纪律）。
> 核实日期：2026-10-30，基线 HEAD `106e6d3`（含 7c0398a PageSkeleton shimmer，并行会话产物）。

| #   | 消费方                                 | hook / 数据源                            | 现状（代码事实）                                                                                                                                                                   | 前提不符点                                                                                | 处置                                                                                                                                                                                                          |
| --- | -------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~`app/search/results.tsx`~~（已摘除） | ~~`useProductSearch`（useProducts.ts）~~ | ——                                                                                                                                                                                 | ——                                                                                        | **已于前端接线批 批1 D3 迁 useOffsetInfinite 摘除**（2026-10-31：后端 bb1820d 交付 `/client/products/search` offset+limit 双口径契约，前端 hook 迁移 + 行为等价测试落地，见 useProducts.ts useProductSearch） |
| 2   | `app/product/list.tsx`                 | `useProductsByCategory` / `useProducts`  | 一次性 `useQuery` 全量返回（products.ts getProducts 不传 page 时后端 take pageSize=20，前端 `res.data.items.map` 直出数组），页面 `products.map` 渲染、**无任何分页/加载更多交互** | 无分页状态机可收（没有 fetchNextPage/onEndReached），换 hook 无对象                       | 维持现状；若后续榜单页需要真分页，走后端待立项同款（getProducts 透传 page/pageSize 后再议）                                                                                                                   |
| 3   | `app/favorites.tsx`                    | `useFavorites`                           | `favoritesApi.list()` → `GET /client/favorites` 全量返回（user.service.ts:292 `findMany` 无 take/skip，契约 FavoriteListItem[] 数组），页面 FlatList 虚拟化渲染已由 P19 落地       | 后端无分页端点，前端无从「换 hook」；且任务书红线「favorites 结构零改动，不虚拟化不拆分」 | 维持现状；收藏量级 <100（页面注释同口径），分页无收益                                                                                                                                                         |

## 已收编（2/4）

- `useRecommendationsInfinite`（useProducts.ts）→ `useOffsetInfinite`：offset 分页 +
  满页短批终止（`lastPage.length === limit`）+ 防连点 + baseOffset/cycle 进 queryKey +
  placeholderData 恒关（keepPreviousData=false 默认），行为等价（原 9 个 jest 用例全过 +
  新增 useOffsetInfinite 单测，见 V2-3）。
- `useProductSearch`（useProducts.ts）→ `useOffsetInfinite`（前端接线批 批1 D3，
  2026-10-31）：后端 bb1820d 交付 `/client/products/search` offset+limit 双口径契约后
  迁入；offset 推进 0→20→40 + 满页短批终止（itemsOf 提业务数组做页长判定）+ 页形状
  保持 {items,total,hasMore}（消费方与页面测试 mock 零改动），首屏同 sortBy 行为等价
  （新增 useProducts.searchInfinite 测试断言）。上方例外表第 1 行随之摘除。

## 行为回归覆盖（V2-3 对齐修订口径）

- recommendations：hook 层 9 用例（追加第二页/短批到底/空批终止/baseOffset 推进/换批换 key/
  cycle 甩缓存/cart 回归）+ 页面层 home-recommend-infinite.test 10 用例（渲染计数断言）。
- search / product-list / favorites：三处代码零改动（例外登记即本表），既有测试
  （search-results-virtualization / favorites-p19 等）作为行为不变证据。

## 后端待立项（单独立项，不入本模块）

- ~~`/client/products/search` offset 化~~：**已完成**（技术债收尾批1 bb1820d 交付双口径契约，
  前端接线批 批1 D3 已收编，见上方「已收编」）。
- `GET /client/favorites` 分页化：无收益（量级），仅记录不建议立项。
