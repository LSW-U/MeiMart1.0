/**
 * 空模块 stub — metro resolver 生产剔除 preview 用（数据层工程治理 批3 D13）。
 * metro.config.js 在 release 构建把 app/preview/** 的模块解析到本文件，
 * 使 preview 代码零进生产包。dev 构建不受影响（resolver 按 __DEV__ 条件化）。
 */
module.exports = {};
