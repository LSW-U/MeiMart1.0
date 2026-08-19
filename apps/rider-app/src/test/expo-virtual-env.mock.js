/**
 * expo/virtual/env 最小 mock（web project / jsdom 用）
 *
 * Why: babel-preset-expo 把源码里的 process.env.EXPO_PUBLIC_* 编译成
 * require('expo/virtual/env') 的 env.EXPO_PUBLIC_*（页面级测试经
 * TaskDetailHeader→useNotifications→api.ts 首次拉进该链）。真包是 ESM 发布
 * （`export const env = process.env`），web project 的 transformIgnorePatterns
 * 不 transform 它 → jsdom 报 "Unexpected token 'export'"。
 *
 * 桩成 CJS：env 透传 process.env（与真包语义一致，测试里读环境变量照常）。
 */
module.exports = { env: process.env };
