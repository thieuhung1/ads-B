import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '../../src/background/state-manager';

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
  },
  declarativeNetRequest: {
    getDynamicRules: vi.fn(async () => []),
    updateDynamicRules: vi.fn(async () => {})
  }
};

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    stateManager = StateManager.getInstance();
  });

  it('lấy stats và quản lý whitelist thống nhất', async () => {
    const stats = await stateManager.getStats();
    expect(stats).toBeDefined();

    await stateManager.addWhitelist('vnexpress.net');
    expect(await stateManager.isWhitelisted('vnexpress.net')).toBe(true);

    await stateManager.removeWhitelist('vnexpress.net');
    expect(await stateManager.isWhitelisted('vnexpress.net')).toBe(false);
  });
});
