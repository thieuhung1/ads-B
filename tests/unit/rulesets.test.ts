import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('DNR Rulesets Verification', () => {
  const rulesDir = path.resolve(process.cwd(), 'public/rules');
  const files = [
    'ruleset-easylist.json',
    'ruleset-easyprivacy.json',
    'ruleset-abpvn.json'
  ];

  it('toàn bộ 3 ruleset file đều tồn tại', () => {
    files.forEach(f => {
      const p = path.join(rulesDir, f);
      expect(fs.existsSync(p), `File ${f} phải tồn tại`).toBe(true);
    });
  });

  it('tổng số rules đạt từ 300 đến 500 rules chuẩn yêu cầu', () => {
    let total = 0;
    files.forEach(f => {
      const content = fs.readFileSync(path.join(rulesDir, f), 'utf-8');
      const rules = JSON.parse(content);
      total += rules.length;
    });
    expect(total).toBeGreaterThanOrEqual(300);
    expect(total).toBeLessThanOrEqual(5000);
    expect(total).toBe(500); // 220 + 160 + 120
  });

  it('các rule ID là duy nhất và không bị xung đột trên toàn hệ thống', () => {
    const allIds = new Set<number>();
    files.forEach(f => {
      const content = fs.readFileSync(path.join(rulesDir, f), 'utf-8');
      const rules = JSON.parse(content);
      rules.forEach((r: any) => {
        expect(allIds.has(r.id), `ID ${r.id} bị trùng lặp trong file ${f}`).toBe(false);
        allIds.add(r.id);
        expect(r.id).toBeGreaterThan(0);
        expect(r.action.type).toBe('block');
        expect(r.condition.urlFilter).toBeDefined();
      });
    });
  });
});
