#!/usr/bin/env node
/**
 * 体积预算门禁（轻量化省流批3 ①，方案v2 D3）
 *
 * Why: JS bundle 是代码变更直接影响的指标——新依赖/新页面悄悄推高包体，
 *      无门禁则「轻量化省流」模块省下的流量被依赖膨胀吃回去。
 *      预算口径（D3 拍板）：只管 JS bundle（hbc），字体/静态资产不在内。
 *
 * 流程：npx expo export --platform android 产出 dist/ → 读 metadata.json 的
 *       android.bundle 路径 → hbc 字节数 vs 预算 8.7MB（基线 8.5MB 实测 20261024
 *       = 8,496,734 B + 200KB 余量）→ 超预算 exit 1（CI 红）。
 *
 * 用法：
 *   node scripts/budget-check.mjs                 # 默认 client-app（流量主战场）
 *   BUDGET_BYTES=9126800 node scripts/budget-check.mjs   # 反向验证：降阈值演示 CI 红
 *   SKIP_EXPORT=1 node scripts/budget-check.mjs   # 复用既有 dist/（本地调试）
 *
 * 反向验证（任务书 ③）：BUDGET_BYTES 调低于实测值 → exit 1 演示红；
 *                      回默认 8.7MB → exit 0 演示绿。
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const APP_DIR = resolve(import.meta.dirname, '..', 'apps', 'client-app');
const METADATA = join(APP_DIR, 'dist', 'metadata.json');

// D3 拍板：8.7MB = 8.5MB 基线 + 200KB 余量（十进制 MB）。
// 基线口径（批3 P3-3 审查补注）：8,496,734 B 为批3 改动前基线（20261024 实测）；
// 批3 落地后复核实测 8,500,600 B（SafeImage thumb 改造净增 ~3.8KB），仍在预算内。
const DEFAULT_BUDGET_BYTES = 8_700_000;
const budgetBytes = process.env.BUDGET_BYTES
  ? Number(process.env.BUDGET_BYTES)
  : DEFAULT_BUDGET_BYTES;

if (!Number.isFinite(budgetBytes) || budgetBytes <= 0) {
  console.error(`❌ BUDGET_BYTES 非法：${process.env.BUDGET_BYTES}`);
  process.exit(1);
}

// 1) expo export（SKIP_EXPORT=1 复用既有 dist/，本地调试用；CI 必须真实导出）
if (!process.env.SKIP_EXPORT) {
  console.log('📦 expo export --platform android（输出 dist/）...');
  execSync('npx expo export --platform android', { cwd: APP_DIR, stdio: 'inherit' });
} else if (!existsSync(METADATA)) {
  console.error('❌ SKIP_EXPORT=1 但 dist/metadata.json 不存在，请先跑 expo export');
  process.exit(1);
}

// 2) 从 metadata.json 解析 android JS bundle 路径（hbc）
if (!existsSync(METADATA)) {
  console.error('❌ dist/metadata.json 不存在——expo export 未产出，无法校验');
  process.exit(1);
}
const meta = JSON.parse(readFileSync(METADATA, 'utf8'));
const bundlePath = meta?.fileMetadata?.android?.bundle;
if (!bundlePath) {
  console.error('❌ metadata.json 缺 fileMetadata.android.bundle——expo export 产物异常');
  process.exit(1);
}
const bundleAbs = join(APP_DIR, 'dist', bundlePath);
const actualBytes = statSync(bundleAbs).size;
const actualMb = (actualBytes / 1_000_000).toFixed(2);
const budgetMb = (budgetBytes / 1_000_000).toFixed(2);

// 3) 预算判定
console.log(`\n📊 JS bundle（hbc）: ${bundlePath}`);
console.log(`   实测 ${actualBytes.toLocaleString()} B (${actualMb} MB)`);
console.log(`   预算 ${budgetBytes.toLocaleString()} B (${budgetMb} MB)`);
// dist/ 已在 .gitignore（root + client-app），导出产物不留工作区痕迹

if (actualBytes > budgetBytes) {
  const over = actualBytes - budgetBytes;
  console.error(`\n❌ 超预算：超出 ${over.toLocaleString()} B。`);
  console.error('   处置：检查本批新增依赖/大库（如整包 lodash、moment）；');
  console.error('   确需超出预算 → 上报调度重测基线并调 BUDGET_BYTES，禁止静默放水。');
  process.exit(1);
}

console.log(`\n✅ 体积预算通过（余量 ${(budgetBytes - actualBytes).toLocaleString()} B）`);
