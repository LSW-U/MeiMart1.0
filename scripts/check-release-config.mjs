#!/usr/bin/env node
/**
 * eas 发布前置校验（第四轮修复 P1-6，D2 拍板：只做前置校验，不填真实值）。
 *
 * 扫两端 eas.json：
 *   - build.*.env.EXPO_PUBLIC_API_BASE_URL：TODO- 占位 / 非合法 http(s) URL
 *   - submit.*（仅 client 有；rider 无 submit 档，按档位可选——存在才校验）：
 *     ios.appleId / ascAppId / appleTeamId TODO- 占位
 *
 * 严格度分档（批2 审查问题① 裁1=推荐 a）：
 *   - 非 production 档（preview/development/…）：TODO- / 非法值 → ❌ fail（exit 1）——
 *     staging 类档位出现占位是真问题，真红拦住
 *   - production 档：降级为 ⚠️ [go-live] 警告打点，不拦（exit 0）——D2 拍板真实域名/
 *     Apple 资质走 go-live 清单，go-live 前不填是预期状态；接 CI 后不能因预期内占位
 *     每次红 CI（掩盖真红）。**go-live 时翻转：把本脚本的 WARN_PROFILES 里的
 *     'production' 移除（或整体改为严格），production 档 TODO 即恢复 fail。**
 *   - submit 档资质字段属 go-live 人工环节，同 production 口径降级警告
 *
 * 用法：node scripts/check-release-config.mjs   # 从任一 app 目录经相对路径调用均可
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// go-live 前允许 TODO- 占位警告放行的档位（非这些档位 TODO/非法值一律 fail）。
// ⚠️ go-live 时把 'production' 从本集合移除，production 档恢复严格 fail。
const WARN_PROFILES = new Set(['production']);

/** TODO- 占位/非法值返回错误描述，合法返回 null；其余必须能 new URL 且协议为 http/https */
function checkUrl(value) {
  if (typeof value !== 'string' || value.startsWith('TODO-')) return 'TODO- 占位';
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return `非法协议 ${u.protocol}`;
  } catch {
    return '非法 URL';
  }
  return null;
}

/** TODO- 占位即问题（submit 资质字段是字符串，非 URL） */
function checkCred(value) {
  if (typeof value !== 'string' || value.startsWith('TODO-')) return 'TODO- 占位';
  return null;
}

const failures = [];
const warnings = [];

/** 按档位分流：WARN_PROFILES 内的档位降级警告，其余入 fail */
function report(kind, app, where, err) {
  const msg = `${app}: ${kind} → ${err}`;
  if (WARN_PROFILES.has(where.profile)) warnings.push(`[go-live] ${msg}`);
  else failures.push(msg);
}

for (const app of ['client-app', 'rider-app']) {
  const easPath = resolve(REPO_ROOT, 'apps', app, 'eas.json');
  let eas;
  try {
    eas = JSON.parse(readFileSync(easPath, 'utf8'));
  } catch (e) {
    failures.push(`${app}: eas.json 解析失败 ${e.message}`);
    continue;
  }

  for (const [profile, cfg] of Object.entries(eas.build ?? {})) {
    const url = cfg?.env?.EXPO_PUBLIC_API_BASE_URL;
    if (url === undefined) continue; // 档位未配 API 地址（如纯 developmentClient），不校验
    const err = checkUrl(url);
    if (err) report('build', app, { profile }, `build.${profile}.EXPO_PUBLIC_API_BASE_URL → ${err}（值: ${url}）`);
  }

  // submit 档可选：rider 无 submit 档按档位可选处理（存在才校验 ios 三字段）；
  // submit 档名沿用 build 档的严格度分档（production 档资质 TODO 降级警告）
  for (const [profile, cfg] of Object.entries(eas.submit ?? {})) {
    const ios = cfg?.ios ?? {};
    for (const field of ['appleId', 'ascAppId', 'appleTeamId']) {
      if (!(field in ios)) continue;
      const err = checkCred(ios[field]);
      if (err) report('submit', app, { profile }, `submit.${profile}.ios.${field} → ${err}`);
    }
  }
}

if (warnings.length) {
  console.log(`⚠️ [go-live] eas 配置占位警告 ${warnings.length} 处（production 档 TODO 属预期，go-live 清单收口；go-live 时翻转本脚本为严格）：`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (failures.length) {
  console.error(`❌ eas 发布前置校验失败 ${failures.length} 处（非 production 档出现 TODO/非法值）：`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('✅ eas 发布前置校验通过（非 production 档无 TODO/非法值；production 档占位已按 [go-live] 警告打点）');
