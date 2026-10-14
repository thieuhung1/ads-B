import { DNR_CONFIG } from './constants';
import { extractNormalizedDomain } from './domain';
import { getWhitelist as storageGetWhitelist } from './storage';

export const ANTI_ADBLOCK_MOVIE_DOMAINS = [
  'animevietsub.nl',
  'animevietsub.tv',
  'animevietsub.io',
  'animevietsub.cc',
  'animevietsub.org'
] as const;

export const ANTI_ADBLOCK_BYPASS_ID_OFFSET = 20000;

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
 * Sinh danh sách quy tắc bypass Anti-Adblock tầng mạng cho các trang phim
 */
export function buildMovieAntiAdblockBypassRules(): chrome.declarativeNetRequest.Rule[] {
  const rules: chrome.declarativeNetRequest.Rule[] = [];

  ANTI_ADBLOCK_MOVIE_DOMAINS.forEach((movieDomain, index) => {
    rules.push({
      id: ANTI_ADBLOCK_BYPASS_ID_OFFSET + index * 2 + 1,
      priority: 100,
      action: { type: 'allowAllRequests' as chrome.declarativeNetRequest.RuleActionType },
      condition: {
        requestDomains: [movieDomain],
        resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType]
      }
    });

    rules.push({
      id: ANTI_ADBLOCK_BYPASS_ID_OFFSET + index * 2 + 2,
      priority: 100,
      action: { type: 'allow' as chrome.declarativeNetRequest.RuleActionType },
      condition: {
        initiatorDomains: [movieDomain]
      }
    });
  });

  return rules;
}

export const ANTI_ADBLOCK_DOMAINS = ANTI_ADBLOCK_MOVIE_DOMAINS;
export const WHITELIST_RULE_ID_START = DNR_CONFIG.WHITELIST_RULE_ID_START;
export const BYPASS_ANTI_ADBLOCK_ID_START = ANTI_ADBLOCK_BYPASS_ID_OFFSET;
export const MANAGED_RULE_ID_MAX = 29999;

export function buildWhitelistDynamicRules(domains: readonly string[]): chrome.declarativeNetRequest.Rule[] {
  return [...buildWhitelistRules(domains), ...buildMovieAntiAdblockBypassRules()];
}

/**
 * BUG-04 & BUG-05 Fix: Đồng bộ nguyên tử (Atomic Sync) danh sách Dynamic Rules vào DeclarativeNetRequest.
 * Chỉ xóa các ID thuộc dải ID do Whitelist và Anti-adblock quản lý (10000–29999)
 * và không xóa nhầm các dynamic rules khác.
 */
export async function syncWhitelistDynamicRules(whitelist: readonly string[]): Promise<void> {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

    const removeRuleIds = existingRules
      .filter((r) => r.id >= WHITELIST_RULE_ID_START && r.id <= MANAGED_RULE_ID_MAX)
      .map((r) => r.id);

    const userRules = buildWhitelistRules(whitelist);
    const bypassRules = buildMovieAntiAdblockBypassRules();
    const addRules = [...userRules, ...bypassRules];

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });

    console.log(`[BlockAds Whitelist] Đã đồng bộ nguyên tử ${addRules.length} dynamic rules (bao gồm ${bypassRules.length} rules vượt anti-adblock phim).`);
  } catch (err) {
    console.error('[BlockAds Whitelist] Lỗi đồng bộ Dynamic Rules:', err);
    throw err;
  }
}

export async function syncWhitelistToDynamicRules(): Promise<string[]> {
  const list = await storageGetWhitelist();
  await syncWhitelistDynamicRules(list);
  return list;
}

export async function addDomainToWhitelist(rawDomain: string): Promise<string[]> {
  const { addToWhitelist } = await import('./storage');
  const updated = await addToWhitelist(rawDomain);
  await syncWhitelistDynamicRules(updated);
  return updated;
}

export async function removeDomainFromWhitelist(rawDomain: string): Promise<string[]> {
  const { removeFromWhitelist } = await import('./storage');
  const updated = await removeFromWhitelist(rawDomain);
  await syncWhitelistDynamicRules(updated);
  return updated;
}

export async function clearWhitelist(): Promise<void> {
  const { clearWhitelist: storageClear } = await import('./storage');
  await storageClear();
  await syncWhitelistDynamicRules([]);
}

