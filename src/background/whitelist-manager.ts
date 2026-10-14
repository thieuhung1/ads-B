import type { WhitelistEntry } from '../shared/types';

const STORAGE_KEY = 'blockads_whitelist';
const BASE_DYNAMIC_RULE_ID = 10000;

const ALL_RESOURCE_TYPES: chrome.declarativeNetRequest.ResourceType[] = [
  'main_frame' as chrome.declarativeNetRequest.ResourceType,
  'sub_frame' as chrome.declarativeNetRequest.ResourceType,
  'stylesheet' as chrome.declarativeNetRequest.ResourceType,
  'script' as chrome.declarativeNetRequest.ResourceType,
  'image' as chrome.declarativeNetRequest.ResourceType,
  'font' as chrome.declarativeNetRequest.ResourceType,
  'object' as chrome.declarativeNetRequest.ResourceType,
  'xmlhttprequest' as chrome.declarativeNetRequest.ResourceType,
  'ping' as chrome.declarativeNetRequest.ResourceType,
  'media' as chrome.declarativeNetRequest.ResourceType,
  'websocket' as chrome.declarativeNetRequest.ResourceType,
  'other' as chrome.declarativeNetRequest.ResourceType
];

export class WhitelistManager {
  private static instance: WhitelistManager;

  private constructor() {}

  public static getInstance(): WhitelistManager {
    if (!WhitelistManager.instance) {
      WhitelistManager.instance = new WhitelistManager();
    }
    return WhitelistManager.instance;
  }

  public async getWhitelist(): Promise<WhitelistEntry[]> {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return (data[STORAGE_KEY] as WhitelistEntry[]) || [];
  }

  public async isWhitelisted(rawDomain: string): Promise<boolean> {
    const domain = this.normalizeDomain(rawDomain);
    if (!domain) return false;
    const list = await this.getWhitelist();
    return list.some(item => item.domain === domain || domain.endsWith(`.${item.domain}`));
  }

  public async addDomain(rawDomain: string): Promise<WhitelistEntry[]> {
    const domain = this.normalizeDomain(rawDomain);
    if (!domain) return await this.getWhitelist();

    const currentList = await this.getWhitelist();
    if (currentList.some(item => item.domain === domain)) {
      return currentList;
    }

    const updatedList = [...currentList, { domain, addedAt: Date.now() }];
    await chrome.storage.local.set({ [STORAGE_KEY]: updatedList });
    await this.syncDynamicRules(updatedList);
    return updatedList;
  }

  public async removeDomain(rawDomain: string): Promise<WhitelistEntry[]> {
    const domain = this.normalizeDomain(rawDomain);
    const currentList = await this.getWhitelist();
    const updatedList = currentList.filter(item => item.domain !== domain);

    await chrome.storage.local.set({ [STORAGE_KEY]: updatedList });
    await this.syncDynamicRules(updatedList);
    return updatedList;
  }

  public async clearAll(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: [] });
    await this.syncDynamicRules([]);
  }

  public normalizeDomain(input: string): string {
    try {
      if (!input) return '';
      let url = input.trim().toLowerCase();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return input.trim().toLowerCase().replace(/^www\./, '');
    }
  }

  public async syncDynamicRules(whitelist?: WhitelistEntry[]): Promise<void> {
    try {
      const list = whitelist || (await this.getWhitelist());
      const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIdsToRemove = currentRules
        .filter(r => r.id >= BASE_DYNAMIC_RULE_ID && r.id < BASE_DYNAMIC_RULE_ID + 5000)
        .map(r => r.id);

      const rulesToAdd: chrome.declarativeNetRequest.Rule[] = [];

      list.forEach((item, index) => {
        const initiatorRuleId = BASE_DYNAMIC_RULE_ID + index * 2;
        const requestRuleId = BASE_DYNAMIC_RULE_ID + index * 2 + 1;

        // Cho phép mọi request bắt nguồn từ trang này (Initiator)
        rulesToAdd.push({
          id: initiatorRuleId,
          priority: 100,
          action: { type: 'allow' as chrome.declarativeNetRequest.RuleActionType },
          condition: {
            initiatorDomains: [item.domain],
            resourceTypes: ALL_RESOURCE_TYPES
          }
        });

        // Cho phép tải chính domain này
        rulesToAdd.push({
          id: requestRuleId,
          priority: 100,
          action: { type: 'allow' as chrome.declarativeNetRequest.RuleActionType },
          condition: {
            requestDomains: [item.domain]
          }
        });
      });

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIdsToRemove,
        addRules: rulesToAdd
      });

      console.log(`[WhitelistManager] Đã đồng bộ ${rulesToAdd.length} dynamic rules cho ${list.length} domains`);
    } catch (err) {
      console.error('[WhitelistManager] Lỗi đồng bộ dynamic rules:', err);
    }
  }
}
