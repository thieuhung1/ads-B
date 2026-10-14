import type { WhitelistEntry } from '../shared/types';
import { extractNormalizedDomain, isDomainWhitelisted } from '../domain';
import {
  getWhitelist as storageGetWhitelist,
  addToWhitelist as storageAddToWhitelist,
  removeFromWhitelist as storageRemoveFromWhitelist,
  clearWhitelist as storageClearWhitelist
} from '../storage';
import { syncWhitelistDynamicRules } from '../whitelist';

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
    const domains = await storageGetWhitelist();
    return domains.map((domain) => ({ domain, addedAt: Date.now() }));
  }

  public async isWhitelisted(rawDomain: string): Promise<boolean> {
    const domain = extractNormalizedDomain(rawDomain);
    if (!domain) return false;
    const list = await storageGetWhitelist();
    return isDomainWhitelisted(domain, list);
  }

  public async addDomain(rawDomain: string): Promise<WhitelistEntry[]> {
    const domain = extractNormalizedDomain(rawDomain);
    if (!domain) return await this.getWhitelist();

    const updatedDomains = await storageAddToWhitelist(domain);
    await syncWhitelistDynamicRules(updatedDomains);
    return updatedDomains.map((d) => ({ domain: d, addedAt: Date.now() }));
  }

  public async removeDomain(rawDomain: string): Promise<WhitelistEntry[]> {
    const domain = extractNormalizedDomain(rawDomain);
    if (!domain) return await this.getWhitelist();

    const updatedDomains = await storageRemoveFromWhitelist(domain);
    await syncWhitelistDynamicRules(updatedDomains);
    return updatedDomains.map((d) => ({ domain: d, addedAt: Date.now() }));
  }

  public async clearAll(): Promise<void> {
    await storageClearWhitelist();
    await syncWhitelistDynamicRules([]);
  }

  public normalizeDomain(input: string): string {
    return extractNormalizedDomain(input) || '';
  }

  public async syncDynamicRules(whitelist?: WhitelistEntry[]): Promise<void> {
    const domains = whitelist
      ? whitelist.map((item) => item.domain).filter(Boolean)
      : await storageGetWhitelist();
    await syncWhitelistDynamicRules(domains);
  }
}

export default WhitelistManager;
