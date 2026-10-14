export interface WhitelistEntry {
  domain: string;
  addedAt: number;
}

export interface BlockStats {
  totalBlocked: number;
  todayBlocked: number;
  lastResetDate: string; // YYYY-MM-DD
  byDomain: Record<string, number>;
}

export interface TabState {
  tabId: number;
  url: string;
  domain: string;
  isWhitelisted: boolean;
  blockedCount: number;
}

export interface DomainAnalysis {
  domain: string;
  isSafe: boolean;
  adCount: number;
  trackersFound: number;
}

export interface AdElementInfo {
  selector: string;
  tagName: string;
  id?: string;
  className?: string;
}

export interface CosmeticStatus {
  hiddenCount: number;
  tempSelectors: string[];
  domain: string;
}

export type MessageType =
  | { type: 'GET_TAB_STATE'; tabId?: number }
  | { type: 'TOGGLE_DOMAIN_PROTECTION'; domain: string; enabled: boolean }
  | { type: 'GET_WHITELIST' }
  | { type: 'ADD_WHITELIST'; domain: string }
  | { type: 'REMOVE_WHITELIST'; domain: string }
  | { type: 'CLEAR_WHITELIST' }
  | { type: 'GET_STATS' }
  | { type: 'RESET_STATS' }
  | { type: 'ANALYZE_DOM'; data?: any }
  | { type: 'REPORT_ELEMENT'; element: AdElementInfo }
  | { type: 'START_TEMP_PICKER'; tabId?: number }
  | { type: 'CANCEL_TEMP_PICKER'; tabId?: number }
  | { type: 'RESET_TEMP_HIDDEN'; tabId?: number }
  | { type: 'TOGGLE_COSMETIC'; enabled: boolean; tabId?: number }
  | { type: 'GET_COSMETIC_STATUS'; tabId?: number };
