export const BADGE_CONFIG = {
  COLOR: '#e74c3c',
  ALERT_COLOR: '#e74c3c',
  DISABLED_COLOR: '#7f8c8d',
  TEXT_COLOR: '#ffffff',
  MAX_COUNT: 999,
  MAX_DISPLAY_COUNT: 999,
  OVERFLOW_TEXT: '999+',
  DISABLED_TEXT: 'OFF',
} as const;

export const DNR_CONFIG = {
  WHITELIST_PRIORITY: 100,
  BYPASS_PRIORITY: 1000,
  WHITELIST_ID_OFFSET: 10000,
  WHITELIST_RULE_ID_START: 10000,
  WHITELIST_RULE_ID_END: 19999,
  BYPASS_ID_OFFSET: 20000,
  MAX_MANAGED_ID: 29999,
  STATIC_RULESETS: ['ruleset_easylist', 'ruleset_easyprivacy', 'ruleset_abpvn'] as const,
} as const;

export const STORAGE_KEYS = {
  WHITELIST: 'blockads_whitelist',
  STATS: 'blockads_stats',
  ENABLED_RULESETS: 'enabledRulesets',
  CUSTOM_FILTERS: 'customFilters',
} as const;

// Danh sách các trang phim có trình kiểm tra Anti-Adblock gắt gao
export const ANTI_ADBLOCK_DOMAINS: readonly string[] = [
  'animevietsub.nl',
  'animevietsub.tv',
  'animevietsub.io',
  'animevietsub.cc',
  'animevietsub.org'
];

// Danh sách từ khóa nhận diện quảng cáo cờ bạc / cá độ bóng đá / tài xỉu
export const GAMBLING_KEYWORDS: readonly string[] = [
  'vsbet', 'vivu88', 'rikvip', 'nhatvip', 'win79', 'sunwin', 'sun.win',
  'go88', 'b52', '789club', 'hitclub', 'kubet', 'f8bet', 'shbet',
  'hi88', 'new88', 'jun88', 'mb66', 'ok9', '8xbet', '188bet', 'w88',
  'm88', 'fb88', 'fun88', 'vn88', 'bk8', 'dafabet', 'cmd368', 'tx88',
  'sin88', 'debet', 'zowin', 'yo88', 'gemwin', 'may88', 'red88',
  'taixiu', 'nohu', 'nhacai', 'cacuoc', 'casino'
];

// Các tên miền mạng xã hội hợp lệ không bị coi là banner cờ bạc
export const SAFE_EXTERNAL_DOMAINS: readonly string[] = [
  'facebook.com',
  'fb.com',
  'youtube.com',
  'youtu.be',
  'discord.gg',
  'discord.com',
  'google.com',
  'github.com'
];

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
