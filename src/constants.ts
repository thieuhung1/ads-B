export const BADGE_CONFIG = {
  ALERT_COLOR: '#e74c3c',
  DISABLED_COLOR: '#7f8c8d',
  TEXT_COLOR: '#ffffff',
  MAX_DISPLAY_COUNT: 999,
  OVERFLOW_TEXT: '999+',
  DISABLED_TEXT: 'OFF',
} as const;

export const DNR_CONFIG = {
  WHITELIST_PRIORITY: 100,
  WHITELIST_RULE_ID_START: 10000,
  WHITELIST_RULE_ID_END: 19999,
  STATIC_RULESETS: ['ruleset_easylist', 'ruleset_easyprivacy', 'ruleset_abpvn'] as const,
} as const;

export const STORAGE_KEYS = {
  WHITELIST: 'blockads_whitelist',
  STATS: 'blockads_stats',
  ENABLED_RULESETS: 'enabledRulesets',
  CUSTOM_FILTERS: 'customFilters',
} as const;

export const RULESET_METADATA = {
  ruleset_easylist: {
    id: 'ruleset_easylist',
    name: 'EasyList (Quốc tế)',
    description: 'Chặn quảng cáo phổ biến toàn cầu (Google, DoubleClick, PopAds...)',
    rulesCount: 220
  },
  ruleset_easyprivacy: {
    id: 'ruleset_easyprivacy',
    name: 'EasyPrivacy (Chống theo dõi)',
    description: 'Chặn trackers & phân tích hành vi (GA, Pixel, Hotjar...)',
    rulesCount: 160
  },
  ruleset_abpvn: {
    id: 'ruleset_abpvn',
    name: 'ABPVN (Việt Nam)',
    description: 'Tối ưu riêng cho báo điện tử và website Việt Nam (eClick, Admicro...)',
    rulesCount: 120
  }
} as const;

export type StaticRulesetId = keyof typeof RULESET_METADATA;
