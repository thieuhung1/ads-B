import type { BlockStats } from '../shared/types';

const STATS_STORAGE_KEY = 'blockads_stats';

export class StatsManager {
  private static instance: StatsManager;
  private tabBlockedMap: Map<number, number> = new Map();
  private stats: BlockStats = {
    totalBlocked: 0,
    todayBlocked: 0,
    lastResetDate: new Date().toISOString().slice(0, 10),
    byDomain: {}
  };

  private constructor() {
    this.init();
  }

  public static getInstance(): StatsManager {
    if (!StatsManager.instance) {
      StatsManager.instance = new StatsManager();
    }
    return StatsManager.instance;
  }

  private async init() {
    const data = await chrome.storage.local.get(STATS_STORAGE_KEY);
    if (data[STATS_STORAGE_KEY]) {
      this.stats = data[STATS_STORAGE_KEY] as BlockStats;
    }
    this.checkDailyReset();
  }

  private checkDailyReset() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.stats.lastResetDate !== today) {
      this.stats.todayBlocked = 0;
      this.stats.lastResetDate = today;
      this.persist();
    }
  }

  public async recordBlock(tabId?: number, domain?: string): Promise<void> {
    this.checkDailyReset();
    this.stats.totalBlocked += 1;
    this.stats.todayBlocked += 1;

    if (domain) {
      this.stats.byDomain[domain] = (this.stats.byDomain[domain] || 0) + 1;
    }

    if (tabId && tabId > 0) {
      const current = this.tabBlockedMap.get(tabId) || 0;
      const updated = current + 1;
      this.tabBlockedMap.set(tabId, updated);
      this.updateTabBadge(tabId, updated);
    }

    await this.persist();
  }

  public getTabBlockedCount(tabId: number): number {
    return this.tabBlockedMap.get(tabId) || 0;
  }

  public resetTab(tabId: number): void {
    this.tabBlockedMap.set(tabId, 0);
    this.updateTabBadge(tabId, 0);
  }

  public removeTab(tabId: number): void {
    this.tabBlockedMap.delete(tabId);
  }

  public async updateTabBadge(tabId: number, count: number): Promise<void> {
    try {
      const text = count > 0 ? (count > 999 ? '999+' : `${count}`) : '';
      await chrome.action.setBadgeText({ tabId, text });
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#e74c3c' });
      await chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' });
    } catch {
      // Tab might have closed
    }
  }

  public async getStats(): Promise<BlockStats> {
    this.checkDailyReset();
    return { ...this.stats };
  }

  public async resetStats(): Promise<void> {
    this.stats = {
      totalBlocked: 0,
      todayBlocked: 0,
      lastResetDate: new Date().toISOString().slice(0, 10),
      byDomain: {}
    };
    this.tabBlockedMap.clear();
    await this.persist();
  }

  private async persist(): Promise<void> {
    await chrome.storage.local.set({ [STATS_STORAGE_KEY]: this.stats });
  }
}
