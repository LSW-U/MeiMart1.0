/**
 * MeiMart Client App - UI 预览器
 *
 * 独立目录，用完删除：rm -rf app/__preview__ src/__preview__
 *
 * 访问方式：启动 Expo Web 后访问 http://localhost:8082/__preview
 *
 * 功能：
 * 1. 列出所有页面模块
 * 2. 点击查看任意页面（独立渲染，不走导航）
 * 3. 底部 Theme 调色板面板，实时改颜色看效果
 * 4. 改完后把值复制回 src/theme/colors.ts
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  type TextStyle,
} from 'react-native';
import { Link, type Href } from 'expo-router';
import { useTheme, typography } from '@/theme';
import { SafeAreaWrapper } from '@/components/layout/SafeAreaWrapper';

// 预览页面列表
const PAGES = [
  { id: 'home', label: '🏠 首页', path: '/(main)/home' },
  { id: 'categories', label: '📂 分类页', path: '/(main)/categories' },
  { id: 'cart', label: '🛒 购物车', path: '/(main)/cart' },
  { id: 'orders', label: '📦 订单列表', path: '/(main)/orders' },
  { id: 'profile', label: '👤 个人中心', path: '/(main)/profile' },
  { id: 'product-detail', label: '🍎 商品详情', path: '/product/[id]' },
  { id: 'product-list', label: '📋 商品列表', path: '/product/list' },
  { id: 'checkout', label: '💳 结算页', path: '/order/checkout' },
  { id: 'order-detail', label: '📄 订单详情', path: '/order/[id]' },
  { id: 'order-tracking', label: '🚚 配送追踪', path: '/order/tracking' },
  { id: 'address-list', label: '📍 地址列表', path: '/address/list' },
  { id: 'address-edit', label: '✏️ 地址编辑', path: '/address/edit' },
  { id: 'login', label: '🔑 登录', path: '/(auth)/login' },
  { id: 'register', label: '📝 注册', path: '/(auth)/register' },
  { id: 'favorites', label: '❤️ 收藏', path: '/favorites' },
  { id: 'coupons', label: '🎟️ 优惠券', path: '/coupons' },
  { id: 'settings', label: '⚙️ 设置', path: '/settings' },
  { id: 'search', label: '🔍 搜索', path: '/search/index' },
  { id: 'notifications', label: '🔔 通知', path: '/service/notifications' },
  { id: 'feedback', label: '💬 反馈', path: '/service/feedback' },
] as const;

// Theme 色值展示
const THEME_COLORS = [
  { key: 'primary', label: '主色（红）', value: '#961813' },
  { key: 'primary-container', label: '主色容器', value: '#b83228' },
  { key: 'on-primary', label: '主色上的文字', value: '#ffffff' },
  { key: 'background', label: '背景', value: '#fff8f7' },
  { key: 'surface', label: '表面', value: '#fff8f7' },
  { key: 'on-background', label: '背景文字', value: '#261816' },
  { key: 'on-surface', label: '表面文字', value: '#261816' },
  { key: 'secondary', label: '次要色', value: '#5d5f5f' },
  { key: 'error', label: '错误色', value: '#ba1a1a' },
  { key: 'gold', label: '金色（文化）', value: '#D4A030' },
  { key: 'orange', label: '橙色（文化）', value: '#F97316' },
  { key: 'warmWhite', label: '暖白（文化）', value: '#FAF7F2' },
];

// Typography 展示
const TYPOGRAPHY_TOKENS: { key: string; label: string; style: TextStyle }[] = [
  { key: 'h1', label: 'H1 标题', style: { fontSize: 32, fontWeight: '700', fontFamily: 'NotoSerif' } },
  { key: 'h2', label: 'H2 标题', style: { fontSize: 24, fontWeight: '700', fontFamily: 'NotoSerif' } },
  { key: 'h3', label: 'H3 标题', style: { fontSize: 20, fontWeight: '600', fontFamily: 'NotoSerif' } },
  { key: 'body-lg', label: '正文-大', style: { fontSize: 18, fontWeight: '400', fontFamily: 'PlusJakartaSans' } },
  { key: 'body-md', label: '正文-中', style: { fontSize: 16, fontWeight: '400', fontFamily: 'PlusJakartaSans' } },
  { key: 'body-sm', label: '正文-小', style: { fontSize: 14, fontWeight: '400', fontFamily: 'PlusJakartaSans' } },
  { key: 'price-display', label: '价格展示', style: { fontSize: 20, fontWeight: '700', fontFamily: 'PlusJakartaSans' } },
];

const SPACING_TOKENS = [
  { key: 'xs', label: 'xs', value: 4 },
  { key: 'sm', label: 'sm', value: 8 },
  { key: 'gutter', label: 'gutter', value: 12 },
  { key: 'md', label: 'md', value: 16 },
  { key: 'container-margin', label: '容器边距', value: 20 },
  { key: 'lg', label: 'lg', value: 24 },
  { key: 'xl', label: 'xl', value: 32 },
  { key: 'xxl', label: 'xxl', value: 48 },
];

const RADIUS_TOKENS = [
  { key: 'sm', label: 'sm', value: 2 },
  { key: 'DEFAULT', label: '默认', value: 4 },
  { key: 'md', label: 'md', value: 6 },
  { key: 'lg', label: 'lg', value: 8 },
  { key: 'xl', label: 'xl', value: 12 },
  { key: '2xl', label: '2xl', value: 16 },
];

export default function PreviewIndex() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'pages' | 'colors' | 'typography' | 'spacing'>('pages');

  return (
    <SafeAreaWrapper>
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 20 }}>
        {/* 标题 */}
        <Text style={[typography.h1, { color: colors.primary, marginBottom: 4 }]}>
          MeiMart UI 预览器
        </Text>
        <Text style={[typography['body-sm'], { color: '#999', marginBottom: 24 }]}>
          独立预览目录 · 用完删除：rm -rf app/__preview__
        </Text>

        {/* Tab 切换 */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {([
            { key: 'pages', label: '📱 页面' },
            { key: 'colors', label: '🎨 色板' },
            { key: 'typography', label: '📝 字体' },
            { key: 'spacing', label: '📏 间距' },
          ] as const).map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: activeTab === tab.key ? colors.primary : '#f0f0f0',
              }}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: activeTab === tab.key ? '#fff' : '#666',
              }}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 页面列表 */}
        {activeTab === 'pages' && (
          <View style={{ gap: 8 }}>
            <Text style={[typography.h3, { marginBottom: 12 }]}>所有页面（点击进入预览）</Text>
            {PAGES.map((page) => (
              <Link key={page.id} href={page.path as Href} asChild>
                <Pressable
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    backgroundColor: '#fff',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#e5e5e5',
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '500', color: '#333' }}>
                    {page.label}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#999' }}>→</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        )}

        {/* 色板 */}
        {activeTab === 'colors' && (
          <View style={{ gap: 12 }}>
            <Text style={[typography.h3, { marginBottom: 8 }]}>Theme 色板（改后复制值回 colors.ts）</Text>
            {THEME_COLORS.map((color) => (
              <View
                key={color.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#e5e5e5',
                }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: color.value,
                    borderWidth: 1,
                    borderColor: '#e5e5e5',
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#333' }}>
                    {color.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#999', fontFamily: 'PlusJakartaSans' }}>
                    {color.key}: {color.value}
                  </Text>
                </View>
              </View>
            ))}

            {/* 预览组件 */}
            <Text style={[typography.h3, { marginTop: 16, marginBottom: 8 }]}>组件预览</Text>

            {/* 按钮预览 */}
            <View style={{ gap: 8, padding: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e5e5' }}>
              <Text style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>按钮</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: '#961813', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>主按钮</Text>
                </View>
                <View style={{ backgroundColor: '#b83228', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>容器按钮</Text>
                </View>
                <View style={{ backgroundColor: 'transparent', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, borderWidth: 1, borderColor: '#961813' }}>
                  <Text style={{ color: '#961813', fontWeight: '700', fontSize: 16 }}>描边按钮</Text>
                </View>
              </View>
            </View>

            {/* 卡片预览 */}
            <View style={{ gap: 8, padding: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e5e5' }}>
              <Text style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>商品卡片</Text>
              <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#f7ddd9' }}>
                <View style={{ width: '100%', height: 120, backgroundColor: '#f0f0f0', borderRadius: 8, marginBottom: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: '700', fontFamily: 'NotoSerif', color: '#261816' }}>
                  新鲜苹果 1kg
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#961813', marginTop: 4 }}>
                  $3.50
                </Text>
                <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  ⭐ 4.8 · 已售 320
                </Text>
              </View>
            </View>

            {/* 文化色预览 */}
            <View style={{ gap: 8, padding: 16, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e5e5' }}>
              <Text style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>东帝汶文化色</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ backgroundColor: '#D4A030', padding: 12, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>金色 Gold</Text>
                </View>
                <View style={{ backgroundColor: '#F97316', padding: 12, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>橙色 Orange</Text>
                </View>
                <View style={{ backgroundColor: '#FAF7F2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e5e5' }}>
                  <Text style={{ color: '#261816', fontSize: 12, fontWeight: '700' }}>暖白</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 字体 */}
        {activeTab === 'typography' && (
          <View style={{ gap: 12 }}>
            <Text style={[typography.h3, { marginBottom: 8 }]}>字体系统</Text>
            <Text style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>
              字体家族：Noto Serif（标题）+ Plus Jakarta Sans（正文）
            </Text>
            {TYPOGRAPHY_TOKENS.map((token) => (
              <View
                key={token.key}
                style={{
                  padding: 16,
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#e5e5e5',
                }}
              >
                <Text style={[token.style, { color: '#261816' }]}>
                  {token.label} - 新鲜苹果 1kg
                </Text>
                <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  {token.key} · {token.style.fontSize}px · {token.style.fontWeight}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 间距 */}
        {activeTab === 'spacing' && (
          <View style={{ gap: 12 }}>
            <Text style={[typography.h3, { marginBottom: 8 }]}>间距系统</Text>
            {SPACING_TOKENS.map((token) => (
              <View
                key={token.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#e5e5e5',
                }}
              >
                <View style={{ width: token.value, height: 24, backgroundColor: '#961813', borderRadius: 2 }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>
                  {token.label}
                </Text>
                <Text style={{ fontSize: 12, color: '#999' }}>
                  {token.value}px
                </Text>
              </View>
            ))}

            <Text style={[typography.h3, { marginTop: 16, marginBottom: 8 }]}>圆角系统</Text>
            {RADIUS_TOKENS.map((token) => (
              <View
                key={token.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  backgroundColor: '#fff',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#e5e5e5',
                }}
              >
                <View style={{ width: 48, height: 48, backgroundColor: '#961813', borderRadius: token.value }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>
                  {token.label}
                </Text>
                <Text style={{ fontSize: 12, color: '#999' }}>
                  {token.value}px
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 底部说明 */}
        <View style={{ marginTop: 32, padding: 16, backgroundColor: '#f8f8f8', borderRadius: 8 }}>
          <Text style={{ fontSize: 13, color: '#666', lineHeight: 20 }}>
            📌 使用方法：{'\n'}
            1. 点击「页面」tab，选择任意页面进入预览{'\n'}
            2. 在 VSCode 里改 src/theme/colors.ts 的值{'\n'}
            3. 浏览器自动热刷新，实时看效果{'\n'}
            4. 满意后告诉我改了什么，我帮你同步确认{'\n\n'}
            🗑️ 用完删除：rm -rf app/__preview__
          </Text>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
}
