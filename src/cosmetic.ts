import { extractNormalizedDomain } from './domain';

// 1. Chỉ giữ các selector thực sự là khung quảng cáo, tránh các class mồi nhử (.adsbox, .ad-banner) trên anti-adblock
export const GENERIC_AD_SELECTORS: readonly string[] = [
  'div[id^="google_ads_iframe_"]',
  'iframe[src*="doubleclick.net"]',
  'div[class*="qc-banner"]',
  // Chặn trực tiếp các thẻ <a> và <img> dẫn tới trang cờ bạc/cá độ
  'a[href*="vsbet"]',
  'a[href*="vivu88"]',
  'a[href*="rikvip"]',
  'a[href*="nhatvip"]',
  'a[href*="go88"]',
  'a[href*="sunwin"]',
  'a[href*="kubet"]',
  'a[href*="f8bet"]',
  'a[href*="shbet"]',
  'a[href*="hi88"]',
  'a[href*="new88"]',
  'a[href*="jun88"]',
  'a[href*="8xbet"]',
  'a[href*="fb88"]',
  'a[href*="w88"]',
  'a[href*="m88"]',
  'a[href*="188bet"]',
  'a[href*="fun88"]',
  'img[src*="vsbet"]',
  'img[src*="vivu88"]',
  'img[src*="rikvip"]',
  'img[src*="nhatvip"]',
  'img[alt*="VSbet" i]',
  'img[alt*="Vivu88" i]',
  'img[alt*="Rikvip" i]',
  'img[alt*="Nhatvip" i]'
] as const;

// 2. Selector đặc thù cho các trang báo & trang xem phim/anime Việt Nam
export const SITE_SPECIFIC_SELECTORS: Record<string, string[]> = {
  'vnexpress.net': ['#sis_large1', '.box_qc', '.banner-ads'],
  'dantri.com.vn': ['.dt-ads', 'div[id^="admzone"]', '.ads-top-banner'],
  'kenh14.vn': ['.k14-ads', 'div[id^="admzone"]', '.adm-sponsored'],
  '24h.com.vn': ['.banner-24h-ads', 'div[id^="banner_"]', '.box-quang-cao'],
  'animevietsub.nl': [
    // Ẩn các khung banner cờ bạc trên đầu, dưới player và cột phải của AnimeVietsub
    '.ad-top',
    '.ads-top',
    '.ad-header',
    '.banner-quangcao',
    '.widget-ads',
    'div[id*="quangcao"]',
    'div[class*="quangcao"]',
    'a[target="_blank"][rel*="nofollow"] > img[src$=".gif"]'
  ]
};

// 3. Danh sách từ khóa nhận diện nhanh quảng cáo cờ bạc / cá độ (dùng để quét DOM động)
export const GAMBLING_KEYWORDS: readonly string[] = [
  'vsbet', 'vivu88', 'rikvip', 'nhatvip', 'go88', 'sunwin', 'b52',
  '789club', 'hitclub', 'kubet', 'f8bet', 'shbet', 'hi88', 'new88',
  'jun88', 'mb66', '8xbet', '188bet', 'w88', 'm88', 'fb88', 'fun88',
  'vn88', 'bk8', 'nhà cái', 'cá cược', 'tài xỉu', 'nổ hũ', 'casino'
] as const;

/**
 * Danh sách selector quảng cáo toàn cầu - Độ chính xác cao (Zero False-Positive)
 */
export const GLOBAL_AD_SELECTORS: readonly string[] = [
  // Google AdSense & GAM / DFP
  '.adsbygoogle',
  'ins.adsbygoogle',
  'div[id^="google_ads_"]',
  'iframe[id^="google_ads_"]',
  'div[id^="div-gpt-ad"]',
  'iframe[id^="div-gpt-ad"]',
  '.dfp-ad',
  '.google-ad',

  // Chuẩn Semantic Ad Classes
  '.ad-banner',
  '.ad-container',
  '.ad-wrapper',
  '.ad-slot',
  '.ad-unit',
  '.ad-zone',
  '.ad-placeholder',
  '.banner-ad',
  '.advertisement',
  '.sponsored-ad',
  '.sponsor-banner',

  // Chuẩn Data Attributes quảng cáo
  '[data-adunit]',
  '[data-ad-slot]',
  '[data-ad-unit]',
  '[data-ad-zone]',
  '[data-ad-client]',
  '[data-google-query-id]',

  // Safe Prefix ID/Class Selectors
  '[id^="ad-banner-"]',
  '[id^="ad-container-"]',
  '[id^="ad-slot-"]',
  '[id^="ad_banner_"]',
  '[id^="ad_slot_"]',
  '[class^="ad-banner-"]',
  '[class^="ad-slot-"]',
  '[class^="ad-wrapper-"]',

  // AMP Ad & Outbrain / Taboola Content Ads
  'amp-ad',
  'amp-embed[type="taboola"]',
  'amp-embed[type="outbrain"]',
  '.outbrain-ad',
  '.taboola-ad',
  '#taboola-below-article-thumbnails',
  '#outbrain-widget',

  // Selector cờ bạc
  ...GENERIC_AD_SELECTORS
] as const;

/**
 * Danh sách selector đặc thù mạng quảng cáo Việt Nam (Admicro, eClick, Ambient, Ants, 24h, Kenh14)
 */
export const VN_AD_SELECTORS: readonly string[] = [
  '.quang-cao',
  '.qc-banner',
  '.box-quangcao',
  '.banner-adv',
  '.adv-banner',
  '.box-adv',

  // Admicro (VCCorp)
  '[id^="admicro_"]',
  '[id^="admicro-"]',
  '[class^="admicro_"]',
  '[class^="admicro-"]',
  '.ambient-ad',
  '.vcc-ad',

  // eClick (FPT)
  '[id^="eclick_"]',
  '[id^="eclick-"]',
  '[class^="eclick_"]',
  '[class^="eclick-"]',
  '[data-eclick]',

  // Ants & VietAd
  '[id^="ants_"]',
  '[class^="ants_"]',
  '[id^="vietad_"]',

  // Vị trí banner báo chí Việt Nam
  '.ads-holder',
  '.ads_zone',
  '.zone-ad',
  '.ad-sidebar',
  '.ad-middle',
  '.ad-top',
  '.ad-bottom'
] as const;

export const ALL_COSMETIC_SELECTORS = [
  ...GLOBAL_AD_SELECTORS,
  ...VN_AD_SELECTORS
] as const;

/**
 * Danh sách selector chuyên biệt cho YouTube
 */
export const YOUTUBE_AD_SELECTORS: readonly string[] = [
  '#masthead-ad',
  'ytd-banner-promo-renderer',
  'ytd-ad-slot-renderer',
  'ytd-in-feed-ad-layout-renderer',
  '#player-ads',
  '.video-ads',
  '.ytp-ad-module',
  'ytd-companion-ad-renderer',
  'ytd-action-companion-ad-renderer'
] as const;

/**
 * Tạo stylesheet chuyên sâu cho từng domain, hỗ trợ bypass Anti-Adblock và diệt quảng cáo cờ bạc
 */
export function getCosmeticStylesheetForDomain(hostname: string, whitelist: string[] = []): string {
  const domain = extractNormalizedDomain(hostname);
  if (!domain) return '';

  const isWhitelisted = whitelist.some(
    (w) => domain === w || domain.endsWith(`.${w}`)
  );
  if (isWhitelisted) return '';

  const matchedSiteSelectors: string[] = [];
  for (const [siteDomain, selectors] of Object.entries(SITE_SPECIFIC_SELECTORS)) {
    if (domain === siteDomain || domain.endsWith(`.${siteDomain}`) || domain.includes('animevietsub')) {
      matchedSiteSelectors.push(...selectors);
    }
  }

  // Nếu đang ở trang có Anti-Adblock mạnh như animevietsub, chỉ dùng bộ lọc Cờ bạc + Site Specific,
  // BỎ QUA các generic selector dễ chạm vào "bẫy" phát hiện Adblock!
  const isAntiAdblockSite = domain.includes('animevietsub') || domain.includes('rophim') || domain.includes('motchill');

  const activeSelectors = isAntiAdblockSite
    ? [...GENERIC_AD_SELECTORS.filter((s) => s.includes('href') || s.includes('img')), ...matchedSiteSelectors]
    : [...GENERIC_AD_SELECTORS, ...matchedSiteSelectors];

  return generateCss(activeSelectors);
}

/**
 * Lấy danh sách selector an toàn tùy biến theo từng domain
 */
export function getSelectorsForDomain(domain?: string): readonly string[] {
  const clean = (domain || '').toLowerCase().replace(/^www\./, '');
  if (clean === 'youtube.com' || clean.endsWith('.youtube.com')) {
    return YOUTUBE_AD_SELECTORS;
  }
  if (clean.includes('animevietsub') || clean.includes('rophim') || clean.includes('motchill')) {
    const siteSpecific = SITE_SPECIFIC_SELECTORS['animevietsub.nl'] || [];
    return [...GENERIC_AD_SELECTORS, ...siteSpecific];
  }
  return ALL_COSMETIC_SELECTORS;
}

/**
 * Tạo chuỗi CSS Declarative thu gọn khung rác không để lại khoảng trống (Zero FOUC)
 */
export function generateCss(selectors: readonly string[]): string {
  if (selectors.length === 0) return '';
  const selectorString = selectors.join(',\n');
  return `${selectorString} {
  display: none !important;
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  opacity: 0 !important;
  pointer-events: none !important;
}`;
}

/**
 * Kiểm tra xem một HTML element có khớp với selector quảng cáo hay không
 */
export function matchesAdSelector(element: Element, domain?: string): boolean {
  if (!element || !element.matches) return false;
  const selectors = getSelectorsForDomain(domain);
  return selectors.some((sel) => {
    try {
      return element.matches(sel);
    } catch {
      return false;
    }
  });
}
