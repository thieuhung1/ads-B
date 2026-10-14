import { BADGE_CONFIG, DNR_CONFIG, STORAGE_KEYS } from './constants';

export interface BlockStats {
  todayCount: number;
  totalCount: number;
  lastResetDate: string;
  byDomain?: Record<string, number>;
}

export interface StorageSchema {
  whitelist: string[];
  stats: BlockStats;
  enabledRulesets: {
    easylist: boolean;
    easyprivacy: boolean;
    abpvn: boolean;
  };
}

const VALID_PROTOCOLS = new Set(['http:', 'https:']);

export const getTodayString = (): string => new Date().toISOString().slice(0, 10);
export const getTodayIsoString = getTodayString;

export const DEFAULT_STORAGE: StorageSchema = {
  whitelist: [],
  stats: {
    todayCount: 0,
    totalCount: 0,
    lastResetDate: getTodayString(),
    byDomain: {}
  },
  enabledRulesets: {
    easylist: true,
    easyprivacy: true,
    abpvn: true
  }
};

// SỬA BUG 4: Loại bỏ hoàn toàn chrome://, edge://, about:blank và chuỗi không phải domain
export function normalizeDomain(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';

  try {
    const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed);
    const parsed = new URL(hasProtocol ? trimmed : `https://${trimmed}`);

    if (!VALID_PROTOCOLS.has(parsed.protocol)) {
      return '';
    }

    const cleanHost = parsed.hostname.replace(/^www\./, '');
    return cleanHost.includes('.') || cleanHost === 'localhost' ? cleanHost : '';
  } catch {
    return '';
  }
}

export function formatBadgeCount(count: number): string {
  if (count <= 0) return '';
  return count > BADGE_CONFIG.MAX_DISPLAY_COUNT ? BADGE_CONFIG.OVERFLOW_TEXT : String(count);
}
export const formatBadgeText = formatBadgeCount;

// SỬA BUG 2: Gom nhóm các lượt chặn trong 250ms và ghi tuần tự qua Promise Mutex chống mất số liệu
let pendingIncrement = 0;
let pendingDomainDeltas: Record<string, number> = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let writeMutex: Promise<BlockStats> = Promise.resolve(DEFAULT_STORAGE.stats);

export function incrementBlockStats(amount = 1): Promise<BlockStats> {
  if (amount <= 0) return getStats();
  pendingIncrement += amount;

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      const delta = pendingIncrement;
      pendingIncrement = 0;
      flushTimer = null;
      writeMutex = writeMutex.then(() => commitStatsDelta(delta));
    }, 250);
  }
  return writeMutex;
}

export function queueStatIncrement(delta = 1, domain?: string): void {
  if (delta <= 0) return;
  if (domain) {
    const cleanDomain = normalizeDomain(domain);
    if (cleanDomain) {
      pendingDomainDeltas[cleanDomain] = (pendingDomainDeltas[cleanDomain] || 0) + delta;
    }
  }
  incrementBlockStats(delta);
}

export async function flushPendingStats(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const delta = pendingIncrement;
  pendingIncrement = 0;
  writeMutex = writeMutex.then(() => commitStatsDelta(delta));
  await writeMutex;
}

async function commitStatsDelta(delta: number): Promise<BlockStats> {
  const deltasToCommit = { ...pendingDomainDeltas };
  pendingDomainDeltas = {};

  const today = getTodayString();
  const data = await chrome.storage.local.get(STORAGE_KEYS.STATS);
  let current: BlockStats = data?.[STORAGE_KEYS.STATS];
  if (!current) {
    const altData = await chrome.storage.local.get('stats');
    current = altData?.['stats'];
  }
  if (!current) {
    current = {
      todayCount: 0,
      totalCount: 0,
      lastResetDate: today,
      byDomain: {}
    };
  }

  const isNewDay = current.lastResetDate !== today;
  const baseToday = isNewDay ? 0 : current.todayCount;
  const baseTotal = current.totalCount;

  const updatedByDomain = { ...(current.byDomain || {}) };
  for (const [dom, count] of Object.entries(deltasToCommit)) {
    updatedByDomain[dom] = (updatedByDomain[dom] || 0) + count;
  }

  const updated: BlockStats = {
    todayCount: baseToday + delta,
    totalCount: baseTotal + delta,
    lastResetDate: today,
    byDomain: updatedByDomain
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.STATS]: updated,
    stats: updated
  });
  return updated;
}

export async function getStats(): Promise<BlockStats> {
  const today = getTodayString();
  const defaultStats: BlockStats = {
    todayCount: 0,
    totalCount: 0,
    lastResetDate: today,
    byDomain: {}
  };

  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.STATS);
    let current: BlockStats = data?.[STORAGE_KEYS.STATS];
    if (!current) {
      const altData = await chrome.storage.local.get('stats');
      current = altData?.['stats'];
    }
    if (!current) current = defaultStats;

    const isNewDay = current.lastResetDate !== today;
    const baseToday = isNewDay ? 0 : current.todayCount;
    const baseTotal = current.totalCount;

    if (isNewDay) {
      current = {
        ...current,
        todayCount: 0,
        lastResetDate: today
      };
      await chrome.storage.local.set({
        [STORAGE_KEYS.STATS]: current,
        stats: current
      });
    }

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

export async function resetStats(): Promise<void> {
  pendingIncrement = 0;
  pendingDomainDeltas = {};
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const cleared: BlockStats = {
    todayCount: 0,
    totalCount: 0,
    lastResetDate: getTodayString(),
    byDomain: {}
  };
  await chrome.storage.local.set({
    [STORAGE_KEYS.STATS]: cleared,
    stats: cleared
  });
}

export async function getWhitelist(): Promise<string[]> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.WHITELIST);
    let list = data?.[STORAGE_KEYS.WHITELIST];
    if (!list) {
      const altData = await chrome.storage.local.get('whitelist');
      list = altData?.['whitelist'];
    }
    if (!Array.isArray(list)) return [];
    return Array.from(
      new Set(
        list
          .map((item) => (typeof item === 'string' ? item : item?.domain))
          .map(normalizeDomain)
          .filter(Boolean)
      )
    );
  } catch {
    return [];
  }
}

export async function addToWhitelist(rawDomain: string): Promise<string[]> {
  const domain = normalizeDomain(rawDomain);
  const current = await getWhitelist();
  if (!domain) return current;

  if (current.includes(domain)) {
    return current;
  }

  const updated = [...current, domain];
  await chrome.storage.local.set({
    [STORAGE_KEYS.WHITELIST]: updated,
    whitelist: updated
  });
  return updated;
}

export async function removeFromWhitelist(rawDomain: string): Promise<string[]> {
  const domain = normalizeDomain(rawDomain);
  const current = await getWhitelist();
  const updated = current.filter((d) => d !== domain);

  await chrome.storage.local.set({
    [STORAGE_KEYS.WHITELIST]: updated,
    whitelist: updated
  });
  return updated;
}

export async function clearWhitelist(): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.WHITELIST]: [],
    whitelist: []
  });
}

export async function getEnabledRulesets(): Promise<string[]> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.ENABLED_RULESETS);
    let list = data?.[STORAGE_KEYS.ENABLED_RULESETS];
    if (Array.isArray(list)) return list;

    const altData = await chrome.storage.local.get('enabledRulesets');
    const raw = altData?.['enabledRulesets'];
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      const res: string[] = [];
      if (raw.easylist) res.push('ruleset_easylist');
      if (raw.easyprivacy) res.push('ruleset_easyprivacy');
      if (raw.abpvn) res.push('ruleset_abpvn');
      return res;
    }
    return [...DNR_CONFIG.STATIC_RULESETS];
  } catch {
    return [...DNR_CONFIG.STATIC_RULESETS];
  }
}

export async function setEnabledRulesets(rulesets: string[]): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.ENABLED_RULESETS]: rulesets
  });
}

export async function getStorageData(): Promise<StorageSchema> {
  const whitelist = await getWhitelist();
  const stats = await getStats();
  const enabledList = await getEnabledRulesets();

  const enabledRulesets = {
    easylist: enabledList.includes('ruleset_easylist') || enabledList.includes('easylist'),
    easyprivacy: enabledList.includes('ruleset_easyprivacy') || enabledList.includes('easyprivacy'),
    abpvn: enabledList.includes('ruleset_abpvn') || enabledList.includes('abpvn')
  };

  return {
    whitelist,
    stats,
    enabledRulesets
  };
}
