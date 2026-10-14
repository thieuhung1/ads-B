import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const RULES_DIR = path.resolve(ROOT_DIR, 'public', 'rules');

const files = [
  'ruleset-easylist.json',
  'ruleset-easyprivacy.json',
  'ruleset-abpvn.json'
];

let hasErrors = false;
let totalValidated = 0;

console.log('🔍 Bắt đầu kiểm tra tính hợp lệ của DNR Rulesets...\n');

for (const file of files) {
  const filePath = path.join(RULES_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File không tồn tại: ${file}`);
    hasErrors = true;
    continue;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rules = JSON.parse(content);

    if (!Array.isArray(rules)) {
      throw new Error('Ruleset phải là một mảng JSON.');
    }

    const seenIds = new Set();

    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (typeof r.id !== 'number' || r.id <= 0) {
        throw new Error(`Rule #${i} ID không hợp lệ: ${r.id}`);
      }
      if (seenIds.has(r.id)) {
        throw new Error(`Trùng lặp ID ${r.id} tại rule #${i}`);
      }
      seenIds.add(r.id);

      if (!r.action || !['block', 'allow', 'redirect', 'upgradeScheme', 'modifyHeaders'].includes(r.action.type)) {
        throw new Error(`Action type không hợp lệ ở rule ID ${r.id}`);
      }

      if (!r.condition || typeof r.condition !== 'object') {
        throw new Error(`Condition không hợp lệ ở rule ID ${r.id}`);
      }

      if (!r.condition.urlFilter && !r.condition.regexFilter) {
        throw new Error(`Thiếu urlFilter hoặc regexFilter ở rule ID ${r.id}`);
      }
    }

    console.log(`✅ ${file}: Hợp lệ! (${rules.length} rules, ID từ ${Math.min(...seenIds)} đến ${Math.max(...seenIds)})`);
    totalValidated += rules.length;
  } catch (err) {
    console.error(`❌ Lỗi kiểm tra file ${file}:`, err.message);
    hasErrors = true;
  }
}

console.log(`\n🎉 Đã kiểm tra tổng cộng: ${totalValidated} rules.`);
if (hasErrors) {
  console.error('⚠️ Phát hiện lỗi trong ruleset!');
  process.exit(1);
} else {
  console.log('✨ Toàn bộ ruleset đều đạt chuẩn Chrome MV3 Declarative Net Request!\n');
}
