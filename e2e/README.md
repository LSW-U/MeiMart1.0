# E2E 测试（Maestro）

## 前置要求

- 安装 Maestro：`curl -Ls "https://get.maestro.mobile.dev" | bash`
- 启动模拟器/连接真机
- 构建 dev client：`npx expo run:android` 或 `npx expo run:ios`

## 运行

```bash
# 单个流程
export MAESTRO_APP_ID=<your.app.id>
maestro test e2e/login-flow.yaml

# 全部
maestro test e2e/
```

## 流程清单

| 流程     | 文件                          | 关键检查点                       |
| -------- | ----------------------------- | -------------------------------- |
| 登录     | login-flow.yaml               | 启动 → 登录页 → 输入 → 进入首页  |
| 搜索商品 | search-product-flow.yaml      | 首页 → 输入 → 搜索结果           |
| 加购     | add-to-cart-flow.yaml         | 商品详情 → 加购 → 购物车         |
| 结算     | checkout-flow.yaml            | 购物车 → 结算 → 支付页           |
| 离线加购 | offline-add-to-cart-flow.yaml | 断网 → 加购 → 入队 → 恢复 → 同步 |

## 注意

- testID 在 Phase 3 / Phase 4 已注入
- 真实运行需 dev client build（不能用 expo go，因 NativeWind/NetInfo 有限制）
- offline-add-to-cart-flow.yaml 仅 Android（adb 命令），iOS 用 `xcrun simctl status_bar`
