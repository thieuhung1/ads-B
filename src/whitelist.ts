import { DNR_CONFIG } from './constants';
import { extractNormalizedDomain } from './domain';

/**
 * Sinh danh sách Dynamic Rules chuẩn DeclarativeNetRequest cho Whitelist.
 * BUG-03 Fix: Mỗi domain sinh ra CẶP 2 quy tắc:
 * 1. `allowAllRequests` cho `requestDomains: [domain]` ở cấp `main_frame` (mở khóa tài nguyên trang chính).
 * 2. `allow` cho `initiatorDomains: [domain]` (mở khóa tài nguyên bên thứ ba xuất phát từ trang này).
 */
export function buildWhitelistRules(domains: readonly string[]): chrome.declarativeNetRequest.Rule[] {
  const uniqueDomains = Array.from(
    new Set(domains.map(extractNormalizedDomain).filter((d): d is string => Boolean(d)))
  );

  const rules: chrome.declarativeNetRequest.Rule[] = [];

  uniqueDomains.forEach((domain, idx) => {
    const baseRuleId = DNR_CONFIG.WHITELIST_RULE_ID_START + idx * 2;

    // Tránh vượt quá dải ID quy định (10000 - 19999)
    if (baseRuleId + 1 > DNR_CONFIG.WHITELIST_RULE_ID_END) {
      console.warn(`[BlockAds Whitelist] Vượt quá giới hạn số lượng domain cho phép trong Whitelist (${DNR_CONFIG.WHITELIST_RULE_ID_END})`);
      return;
    }

    // Rule 1: Mở khóa toàn bộ tài nguyên thuộc trang chính
    rules.push({
      id: baseRuleId,
      priority: DNR_CONFIG.WHITELIST_PRIORITY,
      action: { type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType },
      condition: {
        requestDomains: [domain],
        resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType],
      },
    });

    // Rule 2: Mở khóa toàn bộ request bên thứ 3 xuất phát từ domain này
    rules.push({
      id: baseRuleId + 1,
      priority: DNR_CONFIG.WHITELIST_PRIORITY,
      action: { type: 'allow' as chrome.declarativeNetRequest.RuleActionType },
      condition: {
        initiatorDomains: [domain],
      },
    });
  });

  return rules;
}

/**
 * BUG-04 Fix: Đồng bộ nguyên tử (Atomic Sync) danh sách Dynamic Rules vào DeclarativeNetRequest.
 * Luôn xóa toàn bộ ID cũ trong dải 10000–19999 và nạp rules mới cùng lúc trong 1 giao dịch duy nhất.
 */
export async function syncWhitelistDynamicRules(whitelist: readonly string[]): Promise<void> {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

    // Chỉ xóa các ID nằm trong dải dành riêng cho Whitelist (10000 - 19999)
    const removeRuleIds = existingRules
      .filter(
        (r) =>
          r.id >= DNR_CONFIG.WHITELIST_RULE_ID_START &&
          r.id <= DNR_CONFIG.WHITELIST_RULE_ID_END
      )
      .map((r) => r.id);

    const addRules = buildWhitelistRules(whitelist);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });

    console.log(`[BlockAds Whitelist] Đã đồng bộ nguyên tử ${addRules.length} dynamic rules cho ${whitelist.length} domain.`);
  } catch (err) {
    console.error('[BlockAds Whitelist] Lỗi đồng bộ Dynamic Rules:', err);
    throw err;
  }
}
