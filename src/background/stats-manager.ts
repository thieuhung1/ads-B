import type { BlockStats as LegacyBlockStats } from '../shared/types';
import { BADGE_CONFIG } from '../constants';
import {
  queueStatIncrement,
  getStats as storageGetStats,
  resetStats as storageResetStats,
  formatBadgeText
} from '../storage';

async function getTabCountFromSession(tabId: number): Promise<number> {
  try {
    if (chrome.storage?.session) {
      const key = `tab_${tabId}`;
      const data = await chrome.storage.session.get({ [key]: 0 });
      return Number(data[key]) || 0;
    }
  } catch {
    // fallback
  }
  return 0;
}

async function setTabCountToSession(tabId: number, count: number): Promise<void> {
  try {
    if (chrome.storage?.session) {
      const key = `tab_${tabId}`;
      await chrome.storage.session.set({ [key]: count });
    }
  } catch {
    // fallback
  }
}

async function removeTabCountFromSession(tabId: number): Promise<void> {
  try {
    if (chrome.storage?.session) {
      const key = `tab_${tabId}`;
      await chrome.storage.session.remove(key);
    }
  } catch {
    // fallback
  }
}

export class StatsManager {
  private static instance: StatsManager;
  private tabBlockedMap: Map<number, number> = new Map();

  private constructor() {}

  public static getInstance(): StatsManager {
    if (!StatsManager.instance) {
      StatsManager.instance = new StatsManager();
    }
    return StatsManager.instance;
  }

  /**
   * Ghi nhận một sự kiện quảng cáo / tracker bị chặn.
   * Sử dụng queueStatIncrement để gom nhóm chống Race Condition (BUG-02).
   * Lưu trữ vào chrome.storage.session chống mất dữ liệu khi Service Worker ngủ (BUG-03).
   */
  public async recordBlock(tabId?: number, domain?: string): Promise<void> {
    queueStatIncrement(1, domain);

    if (tabId && tabId > 0) {
      let current = this.tabBlockedMap.get(tabId) || 0;
      if (chrome.storage?.session) {
        const sessionCount = await getTabCountFromSession(tabId);
        current = Math.max(current, sessionCount);
      }
      const updated = current + 1;
      this.tabBlockedMap.set(tabId, updated);
      await setTabCountToSession(tabId, updated);
      await this.updateTabBadge(tabId, updated);
    }
  }

  public getTabBlockedCount(tabId: number): number {
    return this.tabBlockedMap.get(tabId) || 0;
  }

  public async getTabBlockedCountAsync(tabId: number): Promise<number> {
    const memCount = this.tabBlockedMap.get(tabId) || 0;
    if (chrome.storage?.session) {
      const sessionCount = await getTabCountFromSession(tabId);
      const res = Math.max(memCount, sessionCount);
      this.tabBlockedMap.set(tabId, res);
      return res;
    }
    return memCount;
  }

  public async setTabBlockedCount(tabId: number, count: number): Promise<void> {
    this.tabBlockedMap.set(tabId, count);
    await setTabCountToSession(tabId, count);
    await this.updateTabBadge(tabId, count);
  }

  public resetTab(tabId: number): void {
    this.tabBlockedMap.set(tabId, 0);
    setTabCountToSession(tabId, 0).catch(() => {});
    this.updateTabBadge(tabId, 0);
  }

  public removeTab(tabId: number): void {
    this.tabBlockedMap.delete(tabId);
    removeTabCountFromSession(tabId).catch(() => {});
  }

  /**
   * Cập nhật badge hiển thị trên icon extension cho một tab.
   * Tránh magic strings, sử dụng tập trung từ BADGE_CONFIG.
   */
  public async updateTabBadge(tabId: number, count: number): Promise<void> {
    try {
      const text = formatBadgeText(count);
      await chrome.action.setBadgeText({ tabId, text });
      await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_CONFIG.ALERT_COLOR });
      if (chrome.action.setBadgeTextColor) {
        await chrome.action.setBadgeTextColor({ tabId, color: BADGE_CONFIG.TEXT_COLOR });
      }
    } catch {
      // Tab có thể đã đóng trước khi kịp cập nhật Badge
    }
  }

  public async getStats(): Promise<LegacyBlockStats> {
    const s = await storageGetStats();
    return {
      totalBlocked: s.totalCount,
      todayBlocked: s.todayCount,
      lastResetDate: s.lastResetDate,
      byDomain: s.byDomain || {}
    };
  }

  public async resetStats(): Promise<void> {
    await storageResetStats();
    this.tabBlockedMap.clear();
  }
}

export default StatsManager;
