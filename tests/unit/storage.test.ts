import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatBadgeText,
  getTodayIsoString,
  getStats,
  resetStats,
  queueStatIncrement,
  getWhitelist,
  addToWhitelist,
  removeFromWhitelist,
  clearWhitelist
} from '../../src/storage';
import { STORAGE_KEYS } from '../../src/constants';

describe('Storage Module (src/storage.ts)', () => {
  let mockStorage: Record<string, any> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn().mockImplementation((key?: string | Record<string, any>) => {
            if (typeof key === 'string') {
              return Promise.resolve({ [key]: mockStorage[key] });
            }
            if (typeof key === 'object' && key !== null) {
              const res: Record<string, any> = {};
              for (const [k, defaultVal] of Object.entries(key)) {
                res[k] = mockStorage[k] !== undefined ? mockStorage[k] : defaultVal;
              }
              return Promise.resolve(res);
            }
            return Promise.resolve({ ...mockStorage });
          }),
          set: vi.fn().mockImplementation((obj: Record<string, any>) => {
            Object.assign(mockStorage, obj);
            return Promise.resolve();
          })
        }
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('formatBadgeText định dạng text chính xác theo giới hạn 999+', () => {
    expect(formatBadgeText(0)).toBe('');
    expect(formatBadgeText(-5)).toBe('');
    expect(formatBadgeText(1)).toBe('1');
    expect(formatBadgeText(999)).toBe('999');
    expect(formatBadgeText(1000)).toBe('999+');
    expect(formatBadgeText(50000)).toBe('999+');
  });

  it('lấy stats mặc định và tự động reset todayCount nếu sang ngày mới', async () => {
    const stats = await getStats();
    expect(stats.totalCount).toBe(0);
    expect(stats.todayCount).toBe(0);
    expect(stats.lastResetDate).toBe(getTodayIsoString());

    // Giả lập dữ liệu ngày cũ
    mockStorage[STORAGE_KEYS.STATS] = {
      todayCount: 15,
      totalCount: 50,
      lastResetDate: '2020-01-01',
      byDomain: {}
    };

    const newStats = await getStats();
    expect(newStats.totalCount).toBe(50);
    expect(newStats.todayCount).toBe(0); // Đã reset vì qua ngày mới
    expect(newStats.lastResetDate).toBe(getTodayIsoString());
  });

  it('quản lý whitelist an toàn, chuẩn hóa domain và loại bỏ trùng lặp', async () => {
    expect(await getWhitelist()).toEqual([]);

    await addToWhitelist('https://www.vnexpress.net/thoi-su');
    expect(await getWhitelist()).toEqual(['vnexpress.net']);

    // Thêm trùng lặp
    await addToWhitelist('vnexpress.net');
    expect(await getWhitelist()).toEqual(['vnexpress.net']);

    await addToWhitelist('dantri.com.vn');
    expect(await getWhitelist()).toEqual(['vnexpress.net', 'dantri.com.vn']);

    await removeFromWhitelist('vnexpress.net');
    expect(await getWhitelist()).toEqual(['dantri.com.vn']);

    await clearWhitelist();
    expect(await getWhitelist()).toEqual([]);
  });

  it('BUG-02 Fix: queueStatIncrement gom nhóm và commit batch 250ms', async () => {
    vi.useFakeTimers();

    queueStatIncrement(1, 'vnexpress.net');
    queueStatIncrement(2, 'vnexpress.net');
    queueStatIncrement(3, 'dantri.com.vn');

    // Trước 250ms chưa ghi
    expect(chrome.storage.local.set).not.toHaveBeenCalled();

    // Vượt qua mốc 250ms
    await vi.advanceTimersByTimeAsync(300);

    expect(chrome.storage.local.set).toHaveBeenCalledTimes(1);
    expect(mockStorage[STORAGE_KEYS.STATS].totalCount).toBe(6);
    expect(mockStorage[STORAGE_KEYS.STATS].todayCount).toBe(6);
    expect(mockStorage[STORAGE_KEYS.STATS].byDomain['vnexpress.net']).toBe(3);
    expect(mockStorage[STORAGE_KEYS.STATS].byDomain['dantri.com.vn']).toBe(3);

    vi.useRealTimers();
  });
});
