import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WhitelistManager } from '../../src/background/whitelist-manager';

// Mock chrome API
const mockStorage: Record<string, any> = {};
const mockDynamicRules: any[] = [];

(globalThis as any).chrome = {
  storage: {
    local: {
      get: vi.fn(async (key: string) => {
        return { [key]: mockStorage[key] || [] };
      }),
      set: vi.fn(async (obj: Record<string, any>) => {
        Object.assign(mockStorage, obj);
      })
    }
  },
  declarativeNetRequest: {
    getDynamicRules: vi.fn(async () => mockDynamicRules),
    updateDynamicRules: vi.fn(async ({ removeRuleIds = [], addRules = [] }) => {
      for (let i = mockDynamicRules.length - 1; i >= 0; i--) {
        if (removeRuleIds.includes(mockDynamicRules[i].id)) {
          mockDynamicRules.splice(i, 1);
        }
      }
      mockDynamicRules.push(...addRules);
    })
  }
};

describe('WhitelistManager', () => {
  let manager: WhitelistManager;

  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    mockDynamicRules.length = 0;
    manager = WhitelistManager.getInstance();
  });

  it('chuẩn hóa domain chính xác', () => {
    expect(manager.normalizeDomain('https://www.vnexpress.net/thoi-su')).toBe('vnexpress.net');
    expect(manager.normalizeDomain('http://m.youtube.com/watch?v=123')).toBe('m.youtube.com');
    expect(manager.normalizeDomain('facebook.com/')).toBe('facebook.com');
    expect(manager.normalizeDomain('WWW.DANTRI.COM.VN')).toBe('dantri.com.vn');
    expect(manager.normalizeDomain('   kenh14.vn  ')).toBe('kenh14.vn');
  });

  it('thêm domain vào whitelist và lưu trữ bền vững', async () => {
    const list = await manager.addDomain('https://vnexpress.net');
    expect(list.length).toBe(1);
    expect(list[0]?.domain).toBe('vnexpress.net');

    const isWhite = await manager.isWhitelisted('vnexpress.net');
    expect(isWhite).toBe(true);

    const isSubWhite = await manager.isWhitelisted('video.vnexpress.net');
    expect(isSubWhite).toBe(true);
  });

  it('không thêm trùng lặp domain', async () => {
    await manager.addDomain('vnexpress.net');
    const list = await manager.addDomain('https://www.vnexpress.net');
    expect(list.length).toBe(1);
  });

  it('xóa domain khỏi whitelist', async () => {
    await manager.addDomain('vnexpress.net');
    await manager.addDomain('dantri.com.vn');

    const updated = await manager.removeDomain('vnexpress.net');
    expect(updated.length).toBe(1);
    expect(updated[0]?.domain).toBe('dantri.com.vn');

    expect(await manager.isWhitelisted('vnexpress.net')).toBe(false);
    expect(await manager.isWhitelisted('dantri.com.vn')).toBe(true);
  });

  it('xóa toàn bộ danh sách whitelist', async () => {
    await manager.addDomain('vnexpress.net');
    await manager.addDomain('dantri.com.vn');
    await manager.clearAll();

    const list = await manager.getWhitelist();
    expect(list.length).toBe(0);
    expect(mockDynamicRules.length).toBe(0);
  });

  it('đồng bộ chính xác các dynamic rules với DeclarativeNetRequest', async () => {
    await manager.addDomain('vnexpress.net');
    expect(mockDynamicRules.length).toBe(2);
    // BUG-03 Rule 1: allowAllRequests main_frame
    expect(mockDynamicRules[0]?.action?.type).toBe('allowAllRequests');
    expect(mockDynamicRules[0]?.condition?.requestDomains).toEqual(['vnexpress.net']);
    // BUG-03 Rule 2: allow initiatorDomains
    expect(mockDynamicRules[1]?.action?.type).toBe('allow');
    expect(mockDynamicRules[1]?.condition?.initiatorDomains).toEqual(['vnexpress.net']);
  });
});

