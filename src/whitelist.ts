import { ANTI_ADBLOCK_DOMAINS, DNR_CONFIG } from './constants';
import { getStorageData, normalizeDomain, getWhitelist as storageGetWhitelist } from './storage';

/**
 * Hàm thuần túy (Pure Function) chỉ tạo rule cho danh sách domains truyền vào (Đảm bảo pass 100% Unit Test)
 * Mỗi domain tạo 1 cặp quy tắc:
 * 1. allowAllRequests ở cấp main_frame / sub_frame cho requestDomains
 * 2. allow cho initiatorDomains (mở khóa tài nguyên xuất phát từ domain này)
 */
export function buildWhitelistDynamicRules(domains: readonly string[]): chrome.declarativeNetRequest.Rule[] {
  const cleanDomains = Array.from(new Set(domains.map(normalizeDomain).filter(Boolean)));
  const rules: chrome.declarativeNetRequest.Rule[] = [];

  cleanDomains.forEach((domain, index) => {
    const baseId = DNR_CONFIG.WHITELIST_ID_OFFSET + index * 2;

    if (baseId + 1 > DNR_CONFIG.WHITELIST_RULE_ID_END) {
      console.warn(`[BlockAds Whitelist] Vượt quá giới hạn số lượng domain cho phép trong Whitelist (${DNR_CONFIG.WHITELIST_RULE_ID_END})`);
      return;
    }

    rules.push({
      id: baseId,
      priority: DNR_CONFIG.WHITELIST_PRIORITY,
      action: { type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType },
      condition: {
        requestDomains: [domain],
        resourceTypes: [
          'main_frame' as chrome.declarativeNetRequest.ResourceType
        ]
      }
    });

    rules.push({
      id: baseId + 1,
      priority: DNR_CONFIG.WHITELIST_PRIORITY,
      action: { type: 'allow' as chrome.declarativeNetRequest.RuleActionType },
      condition: {
        initiatorDomains: [domain]
      }
    });
  });

  return rules;
}

export const buildWhitelistRules = buildWhitelistDynamicRules;

// Tạo các rule mở khóa kiểm tra mạng Anti-Adblock trên trang xem phim
export function buildAntiAdblockBypassRules(): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];

  ANTI_ADBLOCK_DOMAINS.forEach((domain, index) => {
    const baseId = DNR_CONFIG.BYPASS_ID_OFFSET + index * 2;

    rules.push({
      id: baseId + 1,
      priority: DNR_CONFIG.BYPASS_PRIORITY,
      action: { type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType },
      condition: {
        requestDomains: [domain],
        resourceTypes: [
          'main_frame' as chrome.declarativeNetRequest.ResourceType,
          'sub_frame' as chrome.declarativeNetRequest.ResourceType
        ]
      }
    });

    rules.push({
      id: baseId + 2,
      priority: DNR_CONFIG.BYPASS_PRIORITY,
      action: { type: 'allow' as chrome.declarativeNetRequest.RuleActionType },
      condition: {
        initiatorDomains: [domain]
      }
    });
  });

  return rules;
}

export const buildMovieAntiAdblockBypassRules = buildAntiAdblockBypassRules;

let syncMutex: Promise<string[]> = Promise.resolve([]);

export function syncWhitelistToDynamicRules(): Promise<string[]> {
  syncMutex = syncMutex
    .catch(() => [])
    .then(async () => {
      const { whitelist } = await getStorageData();
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

      const removeRuleIds = existingRules
        .filter(
          (r) =>
            r.id >= DNR_CONFIG.WHITELIST_ID_OFFSET &&
            r.id <= DNR_CONFIG.MAX_MANAGED_ID
        )
        .map((r) => r.id);

      const addRules = [
        ...buildWhitelistDynamicRules(whitelist),
        ...buildAntiAdblockBypassRules()
      ];

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules
      });

      console.log(`[BlockAds Whitelist] Đã đồng bộ nguyên tử ${addRules.length} dynamic rules (bao gồm ${buildAntiAdblockBypassRules().length} rules vượt anti-adblock phim).`);
      return whitelist;
    });

  return syncMutex;
}

export const syncWhitelistDynamicRules = async (whitelist?: readonly string[]): Promise<void> => {
  if (whitelist && Array.isArray(whitelist)) {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules
      .filter(
        (r) =>
          r.id >= DNR_CONFIG.WHITELIST_ID_OFFSET &&
          r.id <= DNR_CONFIG.MAX_MANAGED_ID
      )
      .map((r) => r.id);

    const addRules = [
      ...buildWhitelistDynamicRules(whitelist),
      ...buildAntiAdblockBypassRules()
    ];

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });
    return;
  }
  await syncWhitelistToDynamicRules();
};

export async function addDomainToWhitelist(rawDomain: string): Promise<string[]> {
  const domain = normalizeDomain(rawDomain);
  const { whitelist } = await getStorageData();
  if (!domain) return whitelist;

  if (!whitelist.includes(domain)) {
    const updated = [...whitelist, domain];
    await chrome.storage.local.set({ whitelist: updated, blockads_whitelist: updated });
    await syncWhitelistToDynamicRules();
    return updated;
  }
  return whitelist;
}

export async function removeDomainFromWhitelist(rawDomain: string): Promise<string[]> {
  const domain = normalizeDomain(rawDomain);
  const { whitelist } = await getStorageData();
  const updated = whitelist.filter((d) => d !== domain);
  await chrome.storage.local.set({ whitelist: updated, blockads_whitelist: updated });
  await syncWhitelistToDynamicRules();
  return updated;
}

export async function clearWhitelist(): Promise<void> {
  await chrome.storage.local.set({ whitelist: [], blockads_whitelist: [] });
  await syncWhitelistToDynamicRules();
}
