import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatsManager } from '../../src/background/stats-manager';

const mockStorage: Record<string, any> = {};

(globalThis as any).chrome = {
  storage: {
    local: {
      get: vi.fn(async (key: string) => {
        return { [key]: mockStorage[key] || null };
      }),
      set: vi.fn(async (obj: Record<string, any>) => {
        Object.assign(mockStorage, obj);
      })
    }
  },
  action: {
    setBadgeText: vi.fn(async () => {}),
    setBadgeBackgroundColor: vi.fn(async () => {}),
    setBadgeTextColor: vi.fn(async () => {})
  }
};

describe('StatsManager', () => {
  let statsManager: StatsManager;

  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    statsManager = StatsManager.getInstance();
  });

  it('ghi nhận block request và cập nhật badge theo tab', async () => {
    await statsManager.resetStats();
    await statsManager.recordBlock(1, 'vnexpress.net');
    await statsManager.recordBlock(1, 'vnexpress.net');
    await statsManager.recordBlock(2, 'youtube.com');

    expect(statsManager.getTabBlockedCount(1)).toBe(2);
    expect(statsManager.getTabBlockedCount(2)).toBe(1);

    const stats = await statsManager.getStats();
    expect(stats.totalBlocked).toBe(3);
    expect(stats.todayBlocked).toBe(3);
    expect(stats.byDomain['vnexpress.net']).toBe(2);
    expect(stats.byDomain['youtube.com']).toBe(1);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 1, text: '2' });
  });

  it('reset và remove tab chuẩn xác', async () => {
    await statsManager.recordBlock(10, 'example.com');
    expect(statsManager.getTabBlockedCount(10)).toBe(1);

    statsManager.resetTab(10);
    expect(statsManager.getTabBlockedCount(10)).toBe(0);

    statsManager.removeTab(10);
    expect(statsManager.getTabBlockedCount(10)).toBe(0);
  });
});
