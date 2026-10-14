import { BADGE_CONFIG, STORAGE_KEYS, DNR_CONFIG } from './constants';
import { extractNormalizedDomain } from './domain';

export interface BlockStats {
  todayCount: number;
  totalCount: number;
  lastResetDate: string;
  byDomain?: Record<string, number>;
}

let pendingIncrement = 0;
let pendingDomainDeltas: Record<string, number> = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let mutexChain: Promise<void> = Promise.resolve();

export function getTodayIsoString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatBadgeText(count: number): string {
  if (count <= 0) return '';
  return count > BADGE_CONFIG.MAX_DISPLAY_COUNT
    ? BADGE_CONFIG.OVERFLOW_TEXT
    : String(count);
}

/**
 * Lấy thống kê chặn quảng cáo từ chrome.storage.local.
 * Tự động hòa nhập các lượt tăng đang chờ (pendingIncrement) để dữ liệu tức thì không độ trễ.
 */
export async function getStats(): Promise<BlockStats> {
  const today = getTodayIsoString();
  const defaultStats: BlockStats = {
    todayCount: 0,
    totalCount: 0,
    lastResetDate: today,
    byDomain: {}
  };

  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.STATS);
    const current: BlockStats = (data[STORAGE_KEYS.STATS] as BlockStats) || defaultStats;

    const isNewDay = current.lastResetDate !== today;
    const baseToday = isNewDay ? 0 : current.todayCount;
    const baseTotal = current.totalCount;

    // Merge in-memory pending deltas cho kết quả tức thì
    const mergedByDomain = { ...(current.byDomain || {}) };
    for (const [dom, delta] of Object.entries(pendingDomainDeltas)) {
      mergedByDomain[dom] = (mergedByDomain[dom] || 0) + delta;
    }

    return {
      todayCount: baseToday + pendingIncrement,
      totalCount: baseTotal + pendingIncrement,
      lastResetDate: today,
      byDomain: mergedByDomain
    };
  } catch {
    return defaultStats;
  }
}

/**
 * Reset toàn bộ số liệu thống kê về 0.
 */
export async function resetStats(): Promise<void> {
  pendingIncrement = 0;
  pendingDomainDeltas = {};
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const today = getTodayIsoString();
  const clearedStats: BlockStats = {
    todayCount: 0,
    totalCount: 0,
    lastResetDate: today,
    byDomain: {}
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: clearedStats });
}

/**
 * Cam kết ghi số liệu xuống chrome.storage.local một cách tuần tự (Atomic Transaction).
 */
async function commitIncrementToStorage(amount: number, domainDeltas: Record<string, number>): Promise<void> {
  if (amount <= 0 && Object.keys(domainDeltas).length === 0) return;

  const today = getTodayIsoString();
  const data = await chrome.storage.local.get(STORAGE_KEYS.STATS);
  const current: BlockStats = (data[STORAGE_KEYS.STATS] as BlockStats) || {
    todayCount: 0,
    totalCount: 0,
    lastResetDate: today,
    byDomain: {}
  };

  const isNewDay = current.lastResetDate !== today;
  const updatedByDomain = { ...(current.byDomain || {}) };

  for (const [dom, delta] of Object.entries(domainDeltas)) {
    updatedByDomain[dom] = (updatedByDomain[dom] || 0) + delta;
  }

  const updated: BlockStats = {
    todayCount: (isNewDay ? 0 : current.todayCount) + amount,
    totalCount: current.totalCount + amount,
    lastResetDate: today,
    byDomain: updatedByDomain
  };

  await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: updated });
}

/**
 * Ép cam kết các thay đổi đang chờ ghi xuống Storage ngay lập tức.
 */
export async function flushPendingStats(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const amountToCommit = pendingIncrement;
  const deltasToCommit = { ...pendingDomainDeltas };

  pendingIncrement = 0;
  pendingDomainDeltas = {};

  mutexChain = mutexChain.then(() => commitIncrementToStorage(amountToCommit, deltasToCommit));
  await mutexChain;
}

/**
 * BUG-02 Fix: Gom nhóm các sự kiện chặn trong 250ms và commit tuần tự qua Mutex Chain.
 * Tránh triệt để Race Condition khi hàng chục request bị chặn cùng lúc.
 */
export function queueStatIncrement(delta = 1, domain?: string): void {
  if (delta <= 0) return;
  pendingIncrement += delta;

  if (domain) {
    const cleanDomain = extractNormalizedDomain(domain);
    if (cleanDomain) {
      pendingDomainDeltas[cleanDomain] = (pendingDomainDeltas[cleanDomain] || 0) + delta;
    }
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushPendingStats().catch((err) =>
        console.error('[BlockAds Storage] Lỗi ghi thống kê:', err)
      );
    }, 250);
  }
}

/**
 * Lấy danh sách tên miền trong Whitelist.
 */
export async function getWhitelist(): Promise<string[]> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.WHITELIST);
    const raw = data[STORAGE_KEYS.WHITELIST];
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item) => (typeof item === 'string' ? item : item?.domain))
      .map(extractNormalizedDomain)
      .filter((d): d is string => Boolean(d));
  } catch {
    return [];
  }
}

/**
 * Thêm một tên miền vào Whitelist một cách bền vững.
 */
export async function addToWhitelist(rawDomain: string): Promise<string[]> {
  const domain = extractNormalizedDomain(rawDomain);
  if (!domain) return await getWhitelist();

  const current = await getWhitelist();
  if (current.includes(domain)) {
    return current;
  }

  const updated = [...current, domain];
  await chrome.storage.local.set({ [STORAGE_KEYS.WHITELIST]: updated });
  return updated;
}

/**
 * Xóa một tên miền khỏi Whitelist.
 */
export async function removeFromWhitelist(rawDomain: string): Promise<string[]> {
  const domain = extractNormalizedDomain(rawDomain);
  const current = await getWhitelist();
  const updated = current.filter((d) => d !== domain);

  await chrome.storage.local.set({ [STORAGE_KEYS.WHITELIST]: updated });
  return updated;
}

/**
 * Xóa toàn bộ danh sách Whitelist.
 */
export async function clearWhitelist(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.WHITELIST]: [] });
}

/**
 * Lấy danh sách các static ruleset đang được bật.
 */
export async function getEnabledRulesets(): Promise<string[]> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.ENABLED_RULESETS);
    const list = data[STORAGE_KEYS.ENABLED_RULESETS];
    if (Array.isArray(list)) return list;
    return [...DNR_CONFIG.STATIC_RULESETS];
  } catch {
    return [...DNR_CONFIG.STATIC_RULESETS];
  }
}

/**
 * Lưu danh sách các static ruleset được bật.
 */
export async function setEnabledRulesets(rulesets: string[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.ENABLED_RULESETS]: rulesets });
}
