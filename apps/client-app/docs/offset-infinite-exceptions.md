# 无限滚动收编「前提不符例外」登记（批2 V2-2，2026-10-30 总指挥裁定口径）

> 任务书原口径「四处收编」，总指挥修订：**仅 recommendations 迁入 useOffsetInfinite**；
> 其余三处经代码核实不满足收编前提（无 offset 分页语义可收），登记本表例外，
> 不强行改造（强行收编 = 破坏现有行为契约或臆造后端能力，违反「换 hook 必须行为等价」纪律）。
> 核实日期：2026-10-30，基线 HEAD `106e6d3`（含 7c0398a PageSkeleton shimmer，并行会话产物）。

| #   | 消费方                   | hook / 数据源                           | 现状（代码事实）                                                                                                                                                                         | 前提不符点                                                                                                                                                      | 处置                                                                                                                                                                            |
| --- | ------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `app/search/results.tsx` | `useProductSearch`（useProducts.ts）    | 后端 `/client/products/search` 契约是 **page/pageSize + hasMore**（catalog.controller.ts:191，catalog.service.ts:70/157：page 从 1 起、`hasMore: skip+items.length < total`），非 offset | useOffsetInfinite 的模型是 offset + 满页短批终止；search 的终止信号是 hasMore（与总条数绑定），页长判定不成立（末页可能恰好满页长，短批判定会漏终止或多取一页） | **维持 page 契约**（useProductSearch 原 useInfiniteQuery 实现不动，hook 内已注释「不收编」依据）；**offset 化列为后端待立项**（后端改 offset 形态后前端再收编，单独立项不搭车） |
| 2   | `app/product/list.tsx`   | `useProductsByCategory` / `useProducts` | 一次性 `useQuery` 全量返回（products.ts getProducts 不传 page 时后端 take pageSize=20，前端 `res.data.items.map` 直出数组），页面 `products.map` 渲染、**无任何分页/加载更多交互**       | 无分页状态机可收（没有 fetchNextPage/onEndReached），换 hook 无对象                                                                                             | 维持现状；若后续榜单页需要真分页，走后端待立项同款（getProducts 透传 page/pageSize 后再议）                                                                                     |
| 3   | `app/favorites.tsx`      | `useFavorites`                          | `favoritesApi.list()` → `GET /client/favorites` 全量返回（user.service.ts:292 `findMany` 无 take/skip，契约 FavoriteListItem[] 数组），页面 FlatList 虚拟化渲染已由 P19 落地             | 后端无分页端点，前端无从「换 hook」；且任务书红线「favorites 结构零改动，不虚拟化不拆分」                                                                       | 维持现状；收藏量级 <100（页面注释同口径），分页无收益                                                                                                                           |

## 已收编（1/4）

- `useRecommendationsInfinite`（useProducts.ts）→ `useOffsetInfinite`：offset 分页 +
  满页短批终止（`lastPage.length === limit`）+ 防连点 + baseOffset/cycle 进 queryKey +
  placeholderData 恒关（keepPreviousData=false 默认），行为等价（原 9 个 jest 用例全过 +
  新增 useOffsetInfinite 单测，见 V2-3）。

## 行为回归覆盖（V2-3 对齐修订口径）

- recommendations：hook 层 9 用例（追加第二页/短批到底/空批终止/baseOffset 推进/换批换 key/
  cycle 甩缓存/cart 回归）+ 页面层 home-recommend-infinite.test 10 用例（渲染计数断言）。
- search / product-list / favorites：三处代码零改动（例外登记即本表），既有测试
  （search-results-virtualization / favorites-p19 等）作为行为不变证据。

## 后端待立项（单独立项，不入本模块）

- `/client/products/search` offset 化（或暴露 total 驱动的 offset 翻页）：前置后端契约变更，
  立项后前端 useProductSearch 可平移 useOffsetInfinite（终止判定需同步改为页长口径）。
- `GET /client/favorites` 分页化：无收益（量级），仅记录不建议立项。
