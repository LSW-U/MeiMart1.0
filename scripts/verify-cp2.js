/**
 * CP2 验证：tailwind.config.js 色板 vs HTML 源文件
 */
const fs = require('fs');
const path = require('path');

const htmlDir = '/Users/linsuwei/code/Personal/html-original/pages-app/src/pages';

// 从 HTML 文件提取 tailwind config colors
function extractHtmlColors(htmlPath) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const match = content.match(/tailwind\.config\s*=\s*\{[\s\S]*?colors:\s*\{([\s\S]*?)\},\s*borderRadius/s);
  if (!match) return null;
  const colorsBlock = match[1];
  const colors = {};
  const regex =/"([^"]+)":\s*"([^"]+)"/g;
  let m;
  while ((m = regex.exec(colorsBlock)) !== null) {
    colors[m[1]] = m[2];
  }
  return colors;
}

// 收集所有 HTML 文件
function listHtmlFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listHtmlFiles(full));
    } else if (entry.name.endsWith('.html')) {
      result.push(full);
    }
  }
  return result;
}

const htmlFiles = listHtmlFiles(htmlDir);
console.log(`找到 ${htmlFiles.length} 个 HTML 文件`);

// 取第一个非空 HTML 的颜色作为基准
let htmlColors = null;
for (const f of htmlFiles) {
  const c = extractHtmlColors(f);
  if (c && Object.keys(c).length > 0) {
    htmlColors = c;
    break;
  }
}

if (!htmlColors) {
  console.error('无法从 HTML 提取色板');
  process.exit(1);
}

console.log(`HTML 色板：${Object.keys(htmlColors).length} 个色值`);

// 加载 tailwind.config.js
const twConfigPath = path.resolve(__dirname, '..', 'tailwind.config.js');
delete require.cache[require.resolve(twConfigPath)];
const twConfig = require(twConfigPath);
const twColors = twConfig.theme.extend.colors;

// 收集 twColors 的扁平 key
function flattenColors(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}-${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (typeof value === 'object') {
      Object.assign(result, flattenColors(value, fullKey));
    }
  }
  return result;
}

const twFlat = flattenColors(twColors);
console.log(`Tailwind 扁平色板：${Object.keys(twFlat).length} 个色值`);

// 比对
let missingInTw = 0;
let mismatched = 0;
let matched = 0;

for (const [key, value] of Object.entries(htmlColors)) {
  if (!(key in twFlat)) {
    console.log(`❌ Tailwind 缺失：${key} (${value})`);
    missingInTw++;
  } else if (twFlat[key].toLowerCase() !== value.toLowerCase()) {
    console.log(`⚠️  值不匹配：${key} HTML=${value} TW=${twFlat[key]}`);
    mismatched++;
  } else {
    matched++;
  }
}

console.log('\n=== CP2 验证结果 ===');
console.log(`HTML 色值匹配：${matched}`);
console.log(`HTML 色值缺失：${missingInTw}`);
console.log(`HTML 色值不匹配：${mismatched}`);

if (missingInTw === 0 && mismatched === 0) {
  console.log('\n✅ CP2 通过：tailwind.config.js 色板与 HTML 源完全一致');
  process.exit(0);
} else {
  console.log('\n❌ CP2 失败');
  process.exit(1);
}
