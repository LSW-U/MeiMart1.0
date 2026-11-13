import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, textStyle, spacing, borderRadius, zIndex } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { SafeImage } from '@/components/ui/SafeImage/SafeImage';
import { Badge } from '@/components/ui/Badge';
import {
  useCart,
  useCheckoutPreview,
  useUpdateCartItem,
  useRemoveCartItem,
} from '@/services/queries/useCart';
import { useAddresses } from '@/services/queries/useAddress';
import { useCoupons } from '@/services/queries/usePromotion';
import { CouponPicker } from '@/components/business/CouponPicker/CouponPicker';
import { useLocalizer } from '@/i18n';
import { formatPrice, formatEta } from '@/utils/format';
import type { CartItem } from '@/types';

import type { FloatingCartBarProps, FloatingCartBarRef } from './FloatingCartBar.types';

export type { FloatingCartBarRef } from './FloatingCartBar.types';

// 20261111 拍板：分类页底部悬浮购物车条——垫在 BottomNav 上方，totalItems>0 才渲染。
//   数据组件内部自取 useCart()（同 BottomNav 模式，调用方零 props）；count/total props 仅测试注入。
// 20261112 拍板 v2（用户选「全宽贴底条」）：胶囊取消，改全宽横条贴住 BottomNav 顶边 +
//   叠头像预览（选中商品前 3 张 thumb +N）+ 点击弹出商品面板（全量选中列表 + 去购物车）。
//   面板渲染在 Pressable 兄弟节点（结构性规避 web <button> 嵌套——见 checkoutBtn 去嵌套注释）。
const PREVIEW_MAX = 2;

export const FloatingCartBar = forwardRef<FloatingCartBarRef, FloatingCartBarProps>(
  function FloatingCartBar(
    { count: countOverride, total: totalOverride, onPress, style, testID },
    ref,
  ) {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { data: cart } = useCart();
    const [panelOpen, setPanelOpen] = useState(false);
    // Modal 脱离 SafeAreaWrapper，bottom 定位需自行补 safe-area inset（hooks 须在早退前调用）
    const insets = useSafeAreaInsets();
    const count = countOverride ?? cart?.totalItems ?? 0;
    const total = totalOverride ?? cart?.totalPrice ?? 0;
    const selectedItems = (cart?.items ?? []).filter((i) => i.selected);

    // 方案 C（20261112 拍板）：ref 命令式收面板——页面滚动容器 onScroll 里调用。
    //   8px 阈值由调用方把关（本方法只管收），面板没开时调用是 no-op。
    //   setState 函数式更新天然幂等：未开面板时调用是 no-op。必须在空车早退前调用（hooks 顺序）
    useImperativeHandle(ref, () => ({ dismissPanel: () => setPanelOpen(false) }), []);

    // 方案 A（20261112 拍板）：打开面板时实测条在视口中的位置，Modal 分支按实测值钉位。
    //   Why：关闭态条参照「页面容器」（不含 BottomNav），Modal 是 portal 到 body 的全屏
    //   fixed 层，参照「视口」——同一 bottom 值两分支落点不同，面板一开条就掉到导航栏上
    //   （20261112 实测踩坑）。
    //   ⚠️ 时序必须「先测量后开面板」：RN-web measureInWindow 是 setTimeout(0) 异步回调，
    //   若先 setState 再测量，重渲染会同步卸载旧宿主，回调量到游离节点（rect 全 0），
    //   bottom 被算成视口高、条被钉到屏幕外（20261112 二次实测踩坑「胶囊消失」）。
    //   先测回调里再开面板：条仍在 DOM，坐标真实；Modal 首帧即正确位置（晚一帧 ~16ms）。
    //   ⚠️ handleBarPress 依赖 windowHeight，别加进 useImperativeHandle deps（刷新即可）。
    const [measuredBottom, setMeasuredBottom] = useState<number | null>(null);
    const barHostRef = useRef<View>(null);
    // 20261113 方案 A（面板滚动 native 修复）：测量内容高钳到上限，给 ScrollView 定高。
    //   Why：Yoga 下「父级仅 maxHeight」是不定约束，flexShrink 算不出亏损空间 →
    //   ScrollView 被撑成内容全高无可滚动量（web CSS max-height 真约束掩盖）。
    //   onContentSizeChange 实测内容高 → min(内容, 240) 定高；内容矮时自适应原样
    const [listHeight, setListHeight] = useState<number | null>(null);
    const { height: windowHeight } = useWindowDimensions();
    const handleBarPress = () => {
      // 面板已开：直接收（toggle/条身在 Modal 内嵌套，事件冒泡会双触发——见 toggle 注释）
      if (panelOpen) {
        setPanelOpen(false);
        return;
      }
      const node = barHostRef.current;
      if (node && typeof node.measureInWindow === 'function') {
        // 先测量（条此刻仍在 DOM），回调里拿真实视口底距后再开面板
        node.measureInWindow((_x, y, _w, h) => {
          const dist = windowHeight - (y + h);
          if (dist >= 0) setMeasuredBottom(dist);
          setPanelOpen(true);
        });
      } else {
        // 测量不可用（节点未挂/平台无实现）：回退旧口径直接开面板
        setPanelOpen(true);
      }
    };

    // 空车隐藏（方案拍板 A）：不渲染占位，避免遮挡商品流；面板随胶囊一并消失
    if (count <= 0) return null;

    const previews = selectedItems.slice(0, PREVIEW_MAX);
    const restCount = selectedItems.length - previews.length;

    // 20261112 拍板：购物车 icon 点击直达购物车页（原面板「去购物车」按钮已取消）；
    //   跳转前收面板，避免返回时面板仍开着。
    const handleCartJump = () => {
      setPanelOpen(false);
      onPress?.();
    };

    // 20261112 用户反馈：右上角 X 取消，改「点击面板外任意处收回」。
    //   ⚠️ Modal 只能在 panelOpen 时挂载（visible={panelOpen} 不够）——RN-web Modal 是
    //   position:fixed 全屏层+focus trap，恒挂会盖死整页点击（20261112 实测踩坑）。
    //   架构：关=正常宿主渲染条；开=整棵搬进 Modal（遮罩+面板+条），关闭即卸载。
    //   条体抽 renderBar() 复用，两分支同源。
    const renderBar = () => (
      /* 胶囊条：icon+角标（点=直达购物车，20261112 拍板）| 叠头像 | 合计 | 结算（红底块贴满右侧） */
      <Pressable
        onPress={handleBarPress}
        testID={testID ? `${testID}-bar` : undefined}
        style={({ pressed }) => [
          styles.bar,
          {
            backgroundColor: colors['surface-container-lowest'],
            borderColor: 'rgba(0,0,0,0.06)',
          },
          pressed && { opacity: 0.95 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('cart.a11y.itemCount', { count })}
      >
        {/* 独立点击区：icon 放大（24→28）+ 可点面积 44px，直达购物车页。
          嵌套说明：Pressable 嵌套在 RN 合法（内层优先命中），web 端 RN 0.21 会把
          带 role=button 的内层编成 <button> 造成嵌套——本内层不设 role/label，
          读屏走外层整条 aria-label，规避 hydration 报错（20261112 复用 v1 结论） */}
        <Pressable
          onPress={handleCartJump}
          hitSlop={8}
          testID={testID ? `${testID}-cart-jump` : undefined}
          style={styles.iconBtn}
        >
          <View style={styles.iconWrap}>
            <Icon symbol="shopping_cart" size={28} color={colors.primary} />
            <Badge
              count={count}
              variant="number"
              color={colors.semantic.error}
              hideFromA11y
              style={styles.badge}
            />
          </View>
        </Pressable>
        {/* 叠头像预览：选中前 2 张 24px 圆形 thumb，-8px 叠压 + overflow 圆点
          （20261113 用户拍板：预览缩到 2 张省横排空间，治英文版溢出） */}
        <View style={styles.previewWrap}>
          {previews.map((item, idx) => (
            <View
              key={item.id}
              testID={`fcb-preview-${idx}`}
              style={[
                styles.thumb,
                idx > 0 && styles.thumbOverlap,
                { borderColor: colors['surface-container-lowest'] },
              ]}
            >
              <SafeImage
                source={{ uri: item.product.image }}
                variant="thumb"
                style={styles.thumbImg}
              />
            </View>
          ))}
          {restCount > 0 && (
            /* 20261113 二次拍板：+N 恢复圆底但要叠在头像堆上（用户反馈「没叠在商品上」）
              ——缩到 20px + 负 margin 压住最后一张 thumb，既叠放又比旧 28px 圆点小 */
            <View
              style={[
                styles.thumb,
                styles.restDot,
                {
                  borderColor: colors['surface-container-lowest'],
                  backgroundColor: colors['surface-container-high'],
                },
              ]}
            >
              <Text style={[textStyle('badge-caps'), { color: colors['on-surface-variant'] }]}>
                +{restCount}
              </Text>
            </View>
          )}
        </View>
        {/* 20261113 用户拍板回退横排（方案 B 两行不喜欢）：金额在上导致「金额不出」根因未解
          ——退回单行，靠 detailHint 缩写（Details→Info）+ 已有分级收缩（标签可截，金额不缩）
          解决英文版溢出。totalWrap 保持 flex:1 + baseline 横排 */}
        {/* 20261113 根因修复：「金额不出」真凶是 totalWrap 的 flex:1——rigid 兄弟吃满空间后
          flex:1 剩余份额≈0 → 盒宽 0 → 标签截空、金额从 0 宽盒右溢被后渲染的 detailHint
          节点压住（方案 A/B 全部失败同源）。改「不扩张只收缩」（flexGrow:0+flexShrink:1）：
          按内容自然占宽，空间不足先截标签，金额永远保住 */}
        <View style={styles.totalWrap}>
          <Text
            numberOfLines={1}
            style={[
              textStyle('body-sm'),
              styles.totalLabel,
              { color: colors['on-surface-variant'] },
            ]}
          >
            {t('cart.total')}
          </Text>
          <Text
            numberOfLines={1}
            style={[textStyle('h3'), styles.totalPrice, { color: colors.primary }]}
          >
            {formatPrice(total)}
          </Text>
          {/* 20261112 拍板：合计区加展开指示箭头——面板开合入口可感知化（用户反馈「多数直接
            误点购物车 icon 跳走」）。开面板 expand_more(↑收起提示) 旋转语义：closed=expand_less
            (可展开) / open=expand_more(可收起)，静态切换不引动画 */}
        </View>
        {/* 20261113 web 端「详情跑到中间」修复：totalWrap 去 flex:1 后没人吃剩余空间，
          row 默认 flex-start → 右侧件散落中间。补一个 flex:1 弹性垫片顶住，
          详情/结算恢复靠右 */}
        <View style={styles.flexSpacer} />
        {/* 合计区独立热区（含箭头）：开/关预览面板。icon 跳转语义已隔离（左侧 44px 热区）。
          Why 无 role/label：外层条 Pressable 已带 role=button（RN-web 编成 <button>），
          内层再有 role 会复现 <button> 嵌 <button> hydration 报错（20261112 同 iconBtn
          处理先例）——读屏语义由外层整条 aria-label 承担，testID 保留供测试取证。
          ⚠️ 开面板后整棵树（含条）都在 Modal 内，toggle 事件冒泡到外层条会再触发一次
          handleBarPress——handleBarPress 内先判 panelOpen 直接收，规避「关了又被冒泡开回」 */}
        <Pressable
          onPress={handleBarPress}
          hitSlop={8}
          testID={testID ? `${testID}-total-toggle` : undefined}
        >
          {/* 20261112 用户反馈：「金额右侧加 详情^ 文字入口」——箭头裸图标不可感知，
            加文字提升可发现性；箭头随开合切换 expand_less/expand_more */}
          <View style={styles.detailHintWrap}>
            <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>
              {t('cart.detailHint')}
            </Text>
            <Icon
              symbol={panelOpen ? 'expand_more' : 'expand_less'}
              size={16}
              color={colors['on-surface-variant']}
            />
          </View>
        </Pressable>
        {/* Why: 20261111 用户反馈 web hydration <button> 嵌套——内层去掉 role/label
          （读屏语义由外层整条 aria-label 承担，点结算=点整条开面板），仅保留视觉 */}
        <View style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}>
          <Text style={[textStyle('body-md'), { color: colors['on-primary'], fontWeight: '700' }]}>
            {t('cart.checkout')}
          </Text>
        </View>
      </Pressable>
    );

    return panelOpen ? (
      <Modal
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setPanelOpen(false)}
      >
        {/* animationType="none"（20261112 拍板方案 A）：fade 会对整棵 Modal 内容（含条）
          强加 250ms opacity 0→1 淡入——条本来就可见，经历「卸载→透明→淡入」即闪烁
          （RN-web ModalAnimation fade keyframes 无条件套用）。none=挂载即不透明，
          旧条卸载与新条挂载同 commit（portal 同帧插入），条零位移零闪烁 */}
        {/* 全屏透明遮罩：点击任意处收回面板（面板外的整个屏幕都是点击区）。
          不设 role/label——带 role 的遮罩会被 RN-web 编成 <button>，把条本体嵌进去复现
          hydration 嵌套问题；关闭语义由 Esc（onRequestClose）+ 视觉收回承担 */}
        {/* 20261113 方案 A（native 滚动修复）：遮罩改为「空的全屏兄弟节点」——面板/条宿主
          与遮罩平级，不再嵌进遮罩 Pressable 的触摸子树。Why：iOS 上 RN 给带 onPress 的
          Pressable 挂 RCTTouchHandler(UIGestureRecognizer)，嵌在其中的 ScrollView 的原生
          pan 手势与其竞争被吞（web 无此机制所以正常）。空遮罩无子树，ScrollView 手势独占；
          「点面板外收回」语义不变（遮罩仍全屏）。不设 role/label 同旧注释（防 web <button> 嵌套） */}
        <View style={styles.modalContent}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setPanelOpen(false)}
            testID={testID ? `${testID}-backdrop` : undefined}
          />
          <View
            pointerEvents="box-none"
            style={[
              styles.host,
              style,
              {
                // 方案 A：优先用开面板瞬间实测的视口底距（原位钉住）；首帧测量未回/
                // 失败时回退旧口径（spacing.sm + insets.bottom，web 下=12px 视口底距）
                bottom: measuredBottom != null ? measuredBottom : spacing.sm + insets.bottom,
              },
            ]}
            testID={testID}
          >
            {/* 商品面板：Pressable 兄弟节点（非子节点）——web hydration 结构性安全 */}
            <View
              style={[styles.panel, { backgroundColor: colors['surface-container-lowest'] }]}
              accessibilityLabel={t('cart.selectedPreview')}
            >
              <View style={styles.panelHeader}>
                {/* 20261112 用户反馈：X 关闭钮取消——点面板外任意处即收回 */}
                <Text
                  style={[textStyle('body-md'), { fontWeight: '700', color: colors['on-surface'] }]}
                >
                  {t('cart.selectedPreview')}
                </Text>
              </View>
              <ScrollView
                style={[styles.panelList, listHeight != null && { height: listHeight }]}
                onContentSizeChange={(_w, h) => setListHeight(Math.min(h, 240))}
                showsVerticalScrollIndicator={false}
              >
                {selectedItems.map((item) => (
                  <PanelRow key={item.id} item={item} onNavigate={() => setPanelOpen(false)} />
                ))}
              </ScrollView>
              {/* 金额明细卡（方案 A，20261112 拍板）：运费/券折扣走 useCheckoutPreview（结算页同源），
                无默认地址/未登录/mock 下 preview 为空 → 整卡隐藏不阻塞（弱网降级）。
                预计送达 ETA 20261113 挂账清单 #1 闭环：cart.estimatedDelivery 转正
                （dead-i18n 基线条目已删）。 */}
              <SummaryCard />
              {/* 20261112 拍板：「去购物车」按钮取消——跳转语义迁至条上购物车 icon（点击直达） */}
            </View>
            {renderBar()}
          </View>
        </View>
      </Modal>
    ) : (
      <View ref={barHostRef} style={[styles.host, style]} testID={testID}>
        {renderBar()}
      </View>
    );
  },
);

// 明细行（模块级组件，eslint react-hooks 组件渲染期创建规则）
function SummaryRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[textStyle('body-sm'), { color: colors['on-surface-variant'] }]}>{label}</Text>
      <Text
        style={[
          textStyle('body-sm'),
          { fontWeight: '700', color: accent ? colors.primary : colors['on-surface'] },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// 券入口行（20261113 挂账 #3 闭环）：discount 行可点 → 弹 CouponPicker 选券。
//   couponCode 驱动 useCheckoutPreview(addressId, code) 重查（key 含券码，结算页同机制
//   checkout.tsx:85-93 先例）——注意 key 在本组件与 SummaryCard 是同一个
//   CHECKOUT_PREVIEW_KEY(defaultAddressId, code)：本组件 onSelect 置码后 key 变 →
//   两处 preview 同时重查，SummaryCard 的 discount/payableAmount 自动跟进。
//   无可用券且无折扣时整行不渲染；CouponPicker 是 ui/Modal 壳（组件库 Modal 非 RN
//   Modal），与面板自身 RN Modal 不冲突。
//   20261113 审查挂账（🟡1/🟡2，既有缺口非本批引入，与 checkout.tsx 两处一致）：
//   ① couponValid 未消费——后端判券失效时 discount=0，UI 只显券码无报错提示；
//   ② 门槛口径用 cart.totalPrice（全量）非选中项小计，未选商品计入可能放行
//   后端按小计判无效的券。真机验收留意，后续立项「券失效反馈」统一治理。
function CouponEntryWrapper() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data: addresses } = useAddresses();
  const { data: cart } = useCart();
  // 与 SummaryCard 同 key（同地址 + 同券码）：选券后 RQ 同 key 重查一次，双订阅共享缓存
  const [couponCode, setCouponCode] = useState<string | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const defaultAddress = addresses?.find((a) => a.isDefault);
  const { data: preview } = useCheckoutPreview(defaultAddress?.id, couponCode);
  const { data: coupons } = useCoupons('available');

  const discount = preview?.discount ?? 0;
  // 无可用券且无折扣：整行不渲染（preview 未加载时外层已隐藏）
  if (discount <= 0 && (coupons?.length ?? 0) === 0) return null;

  return (
    <>
      <Pressable
        onPress={() => setPickerOpen(true)}
        style={styles.summaryRow}
        accessibilityRole="button"
        accessibilityLabel={couponCode ? t('checkout.coupon.change') : t('checkout.coupon.select')}
        testID="fcb-coupon-entry"
      >
        <View style={styles.couponEntryLeft}>
          <Icon symbol="confirmation_number" size={16} color={colors.semantic.positive} />
          <Text
            style={[textStyle('body-sm'), { color: colors.semantic.positive }]}
            numberOfLines={1}
          >
            {couponCode ?? t('checkout.coupon.select')}
          </Text>
        </View>
        <View style={styles.couponEntryRight}>
          {discount > 0 && (
            <Text style={[textStyle('body-sm'), { color: colors.semantic.positive }]}>
              -{formatPrice(discount)}
            </Text>
          )}
          <Icon symbol="chevron_right" size={16} color={colors['on-surface-variant']} />
        </View>
      </Pressable>
      <CouponPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        coupons={coupons ?? []}
        orderAmount={cart?.totalPrice ?? 0}
        selectedCode={couponCode}
        onSelect={setCouponCode}
        testID="fcb-coupon-picker"
      />
    </>
  );
}

// 金额明细卡：商品合计 + 券折扣 + 运费 + 预计实付（payableAmount 后端聚合）。
//   preview 未加载（无默认地址/未登录/mock/弱网）整卡隐藏——数据行缺一不可，宁缺毋假。
//   方案 B（20261113）：加减数/删除后 preview 重查有网络往返（方案 A 失效后 soft refetch），
//   弱网下「预计实付」滞后半拍——用本地差额即时补偿：optimistic delta =
//   当前 cart.totalPrice（乐观更新后）− preview.itemsSubtotal（快照基线），加减数/删行
//   场景 discount/deliveryFee 不随数量变，payable + delta 即实时正确值；preview refetch
//   落地后 delta 归 0，自然切换回后端真值。delta 仅在确实有差额时应用（快照新鲜=0）。
function SummaryCard() {
  const { t, i18n } = useTranslation();
  const { data: addresses } = useAddresses();
  const { data: cart } = useCart();
  // 与结算页同口径取默认地址（checkout.tsx 用 resolveSmartDefaultAddress + 选择态；
  // 悬浮条无选择态，直接取 isDefault 首个即可）
  const defaultAddress = addresses?.find((a) => a.isDefault);
  const { data: preview } = useCheckoutPreview(defaultAddress?.id);

  // 全部明细可用才渲染（payableAmount 恒有；deliveryFee/discount 可为 0 合法值）
  if (!preview) return null;
  const discount = preview.discount;
  const deliveryFee = preview.deliveryFee;
  // 本地差额补偿（方案 B）：cart.totalPrice 是全部商品合计（选中+未选），preview 快照
  // 的 itemsSubtotal 基线也是全量口径（后端 checkout-preview 按整单聚合），直接相减即
  // 数量变动差额；无差额（快照新鲜）时 delta=0 不影响显示。负数合法（删除后 totalPrice 变小）
  const delta = cart ? cart.totalPrice - preview.itemsSubtotal : 0;
  const payable = preview.payableAmount + delta;
  // 20261113 挂账 #1：ETA 文案——结算页同源（checkout.tsx:182 先例），非法/缺失日期
  // formatEta 原样回退，但缺字段时为 undefined → 整行隐藏（宁缺毋假）
  const etaText = preview.estimatedDeliveryTime
    ? formatEta(preview.estimatedDeliveryTime, i18n.language)
    : undefined;

  return (
    <View style={styles.summaryCard} testID="fcb-summary">
      {/* 20261112 用户反馈：合计与胶囊条内合计重复，明细卡不再重复展示。
        20261113 审查 🟡3 修复：恢复 discount>0 条件渲染——无券无折扣时恒显 -$0.00
        冗余（券入口行已承担「无券」展示，且入口行右侧 -xx 与本行双展示重叠） */}
      {discount > 0 && (
        <SummaryRow label={t('cart.discountLabel')} value={`-${formatPrice(discount)}`} accent />
      )}
      {/* 20261113 挂账 #3：券入口行——discount 行可点弹 CouponPicker；券码驱动
        useCheckoutPreview 重查（key 含券码，结算页同机制）。放 SummaryCard 外层
        （内部自取 addresses/coupons hooks，避免 hooks 顺序受 preview 早退影响） */}
      {preview && <CouponEntryWrapper />}
      <SummaryRow
        label={t('cart.deliveryFeeLabel')}
        value={deliveryFee > 0 ? formatPrice(deliveryFee) : t('cart.freeDelivery')}
        accent={deliveryFee <= 0}
      />
      {/* 20261113 挂账 #1 闭环：ETA 行——estimatedDeliveryTime 与结算页同源同格式
        （formatEta + cart.estimatedDelivery {{time}} 文案，checkout.tsx:432 先例）。
        时间已在 label 文案内（value 留空仅保行结构）；字段缺时整行隐藏，宁缺毋假 */}
      {etaText && <SummaryRow label={t('cart.estimatedDelivery', { time: etaText })} value="" />}
      {/* 20261112 用户反馈：明细卡内分隔线删掉（仅留行间距） */}
      <SummaryRow label={t('cart.estimatedPayable')} value={formatPrice(payable)} />
    </View>
  );
}

// 面板行：32px 小图 + 品名（2 行截断，图+品名整体可点跳详情）+ −/+ 步进器（乐观更新）+ 小计。
//   20261113 用户拍板：行点击跳 /product/[id]（跳前收面板，同 handleCartJump 约定，
//   避免返回时面板还开着）；步进器走 useUpdateCartItem（自带 onMutate 乐观更新+
//   onError 回滚三件套），合计随同 key 缓存自动刷新；数量减到 1 再按 − 弹 Alert
//   确认删除（复用购物车页 cart.removeTitle/deleteConfirm key）。
//   步进器内层 Pressable 不设 role/label（防 web <button> 嵌套 hydration，同 iconBtn 先例）。
function PanelRow({ item, onNavigate }: { item: CartItem; onNavigate: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  // 契约 P2-2：LocalizableText 取值走 localize()（回退链），禁下标直取
  const localize = useLocalizer();
  const { mutate: updateItem } = useUpdateCartItem();
  const { mutate: removeItem } = useRemoveCartItem();

  const setQuantity = (qty: number) => {
    if (qty < 1) return;
    updateItem({ itemId: item.id, updates: { quantity: qty } });
  };

  // 数量为 1 时再按 −：Alert 确认后删除（防误触，购物车页同款确认流）
  const handleDecrement = () => {
    if (item.quantity > 1) {
      setQuantity(item.quantity - 1);
      return;
    }
    Alert.alert(t('cart.removeTitle'), t('cart.deleteConfirm', { count: 1 }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => removeItem(item.id),
      },
    ]);
  };

  // 行跳转只绑图+品名（步进器是独立热区，不冒泡跳转）；跳前经 onNavigate 收面板
  const goDetail = () => {
    onNavigate();
    router.push(`/product/${item.product.id}` as const);
  };

  return (
    <View style={styles.panelRow}>
      <Pressable onPress={goDetail} style={styles.panelLead} hitSlop={4}>
        <View style={styles.panelThumb}>
          <SafeImage source={{ uri: item.product.image }} variant="thumb" style={styles.thumbImg} />
        </View>
        <Text
          style={[styles.panelName, textStyle('body-sm'), { color: colors['on-surface'] }]}
          numberOfLines={2}
        >
          {localize(item.product.name)}
        </Text>
      </Pressable>
      <View style={styles.qtyStepper}>
        {/* 步进器 −/+：内层 Pressable 不设 role/label（web <button> 嵌套规避，见函数头注释）。
            圆形描边色 inline 注入（styles 静态段禁引 colors）；hitSlop=10 保 44px 级触达
            （视觉钮 22px 缩档后布局热区不足，hitSlop 不占布局） */}
        <Pressable
          onPress={handleDecrement}
          hitSlop={10}
          style={[styles.qtyBtn, { borderColor: colors['outline-variant'] }]}
          testID={`fcb-qty-minus-${item.id}`}
        >
          <MaterialCommunityIcons name="minus" size={14} color={colors.primary} />
        </Pressable>
        <Text style={[textStyle('body-sm'), styles.qtyNum, { color: colors['on-surface'] }]}>
          {item.quantity}
        </Text>
        <Pressable
          onPress={() => setQuantity(item.quantity + 1)}
          hitSlop={10}
          style={[styles.qtyBtn, { borderColor: colors['outline-variant'] }]}
          testID={`fcb-qty-plus-${item.id}`}
        >
          <MaterialCommunityIcons name="plus" size={14} color={colors.primary} />
        </Pressable>
      </View>
      <Text style={[textStyle('body-md'), { color: colors.primary, fontWeight: '700' }]}>
        {formatPrice(item.product.price * item.quantity)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Modal 内容层：flex:1 全屏容器，空遮罩（backdrop）与面板/条宿主（host）平级
  modalContent: {
    flex: 1,
  },
  // 全屏透明遮罩（空兄弟节点）：只吃「面板外」的点击，收面板用
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  host: {
    position: 'absolute',
    // 20261112 v3 拍板：胶囊形态回归（用户对比全宽后要求试试胶囊）——两侧留边 + 全圆角，
    //   贴底边距 sm(12) 让胶囊「悬浮」而非「坐死」在 nav/窗口底。bottom 参照=最近定位父级
    //   底边（取证结论不变），categories 页=nav 顶边上方 12，search 页=窗口底上方 12。
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.sm,
    zIndex: zIndex.raised,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 64, // 20261112 用户反馈：胶囊增高一档（56→64），icon 44px 点击区不挤
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
  },
  panel: {
    // 20261113 方案 A（模拟器面板不滚修复）：panel 加 maxHeight 上界，ScrollView 靠
    //   flex:1 从父级拿有界空间——native Yoga 下「父级自适应 + 子级只有 maxHeight」时
    //   ScrollView 被撑成内容全高（web CSS max-height 独立生效掩盖了这一点）
    maxHeight: 300,
    marginBottom: 8,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    // 20261112 用户反馈：标题下描边删掉（「已选商品」与商品列表间不留横线）
  },
  panelList: {
    // 20261113 方案 A：定高由 onContentSizeChange 钳值注入（max 240），
    //   panel 的 maxHeight:300 保留作整体兜底。未测量前不设 height（首帧自适应）
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  panelName: {
    flex: 1,
  },
  // 图+品名整体点击区（跳详情）：flex:1 吃掉行内剩余宽度，步进器/小计靠右
  panelLead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // −/+ 步进器（20261113 用户反馈：收紧间隙 + 圆形描边钮）：
  //   gap 归零——描边圆自带视觉边界；钮内 16→14px 图标不顶边，
  //   圆钮 24→22 省行宽；borderColor 运行时 inline 注入（静态段禁引 colors）
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNum: {
    minWidth: 14,
    textAlign: 'center',
  },
  panelThumb: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  iconBtn: {
    // 20261112 拍板：icon 点击区放大到 44px（a11y 触达标准），点击直达购物车页
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    // 20261112 用户反馈：运费上方分隔线删掉（明细卡与列表间仅留间距）
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // 券入口行左右分组（checkout.tsx couponEntryLeft/Right 同构）
  couponEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  couponEntryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconWrap: {
    position: 'relative',
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -10,
    zIndex: zIndex.base,
  },
  previewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOverlap: {
    // 20261113 用户要求叠深一点：-8 → -12（24px thumb 压掉一半，更省横排空间）
    marginLeft: -12,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  restDot: {
    // 20261113 二次拍板：+N 圆点缩号（28→20px）+ 负 margin 叠在头像堆上
    width: 20,
    height: 20,
    marginLeft: -10,
    zIndex: zIndex.base + 1,
  },
  flexSpacer: {
    // 右对齐垫片：吃掉 totalWrap 之后的全部剩余空间（web 端详情居中修复）
    flex: 1,
  },
  totalWrap: {
    // 20261113 根因修复：去 flex:1（0 宽盒压金额），改自然占宽+可收缩
    flexGrow: 0,
    flexShrink: 1,
    // ⚠️ web 关键：CSS flex 项默认 min-width:auto——不显式置 0 时 flexShrink 无效，
    //   totalWrap 缩不动整块溢出，金额被挤出胶囊外裁掉（20261113 web 实测「金额不出」二次复发）
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  totalLabel: {
    flexShrink: 1,
  },
  totalPrice: {
    flexShrink: 0,
  },
  detailHintWrap: {
    // 「详情^」文字+箭头水平排布，同 on-surface-variant 灰阶弱化不抢金额视觉
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  checkoutBtn: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
});
