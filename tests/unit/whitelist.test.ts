import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildWhitelistRules, syncWhitelistDynamicRules } from '../../src/whitelist';
import { DNR_CONFIG } from '../../src/constants';

describe('Whitelist Module (src/whitelist.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sinh cặp 2 ruleset cho mỗi domain theo đúng thiết kế BUG-03', () => {
    const domains = ['vnexpress.net', 'dantri.com.vn'];
    const rules = buildWhitelistRules(domains);

    // 2 domains * 2 rules/domain = 4 rules
    expect(rules).toHaveLength(4);

    // Domain 1 - Rule 1: allowAllRequests main_frame
    expect(rules[0]!.id).toBe(DNR_CONFIG.WHITELIST_RULE_ID_START);
    expect(rules[0]!.priority).toBe(DNR_CONFIG.WHITELIST_PRIORITY);
    expect(rules[0]!.action.type).toBe('allowAllRequests');
    expect(rules[0]!.condition.requestDomains).toEqual(['vnexpress.net']);
    expect(rules[0]!.condition.resourceTypes).toEqual(['main_frame']);

    // Domain 1 - Rule 2: allow initiatorDomains (third-party unlock)
    expect(rules[1]!.id).toBe(DNR_CONFIG.WHITELIST_RULE_ID_START + 1);
    expect(rules[1]!.priority).toBe(DNR_CONFIG.WHITELIST_PRIORITY);
    expect(rules[1]!.action.type).toBe('allow');
    expect(rules[1]!.condition.initiatorDomains).toEqual(['vnexpress.net']);

    // Domain 2
    expect(rules[2]!.id).toBe(DNR_CONFIG.WHITELIST_RULE_ID_START + 2);
    expect(rules[2]!.condition.requestDomains).toEqual(['dantri.com.vn']);
    expect(rules[3]!.id).toBe(DNR_CONFIG.WHITELIST_RULE_ID_START + 3);
    expect(rules[3]!.condition.initiatorDomains).toEqual(['dantri.com.vn']);
  });

  it('loại bỏ các domain trùng lặp và rỗng', () => {
    const domains = ['vnexpress.net', 'https://www.vnexpress.net', '', '  ', 'vnexpress.net'];
    const rules = buildWhitelistRules(domains);

    // Chỉ có 1 domain duy nhất hợp lệ => 2 rules
    expect(rules).toHaveLength(2);
    expect(rules[0]!.condition.requestDomains).toEqual(['vnexpress.net']);

  });

  it('đồng bộ nguyên tử (BUG-04) chỉ xóa và thay thế trong dải ID 10000 - 19999', async () => {
    const existingRules = [
      { id: 10000, priority: 100, action: { type: 'allowAllRequests' }, condition: {} },
      { id: 10001, priority: 100, action: { type: 'allow' }, condition: {} },
      { id: 50, priority: 1, action: { type: 'block' }, condition: {} } // Rule khác không thuộc whitelist
    ];

    (globalThis as any).chrome = {
      declarativeNetRequest: {
        getDynamicRules: vi.fn().mockResolvedValue(existingRules),
        updateDynamicRules: vi.fn().mockResolvedValue(undefined)
      }
    };

    await syncWhitelistDynamicRules(['24h.com.vn']);

    expect(chrome.declarativeNetRequest.getDynamicRules).toHaveBeenCalled();
    expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [10000, 10001], // Không xóa ID 50
      addRules: expect.arrayContaining([
        expect.objectContaining({ id: 10000 }),
        expect.objectContaining({ id: 10001 })
      ])
    });
  });
});
