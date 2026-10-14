/**
 * Danh sách selector quảng cáo toàn cầu - Độ chính xác cao (Zero False-Positive)
 * TUYỆT ĐỐI không dùng wildcard substring nguy hiểm như:
 * - [class*="ad-container"] (khớp nhầm upload-container, load-container)
 * - [class*="ad-wrapper"] (khớp nhầm upload-wrapper, load-wrapper)
 * - [id*="-ad-"] (khớp nhầm azure-ad-login, lead-admin)
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
  '#outbrain-widget'
] as const;

/**
 * Danh sách selector đặc thù mạng quảng cáo Việt Nam (Admicro, eClick, Ambient, Ants, 24h, Kenh14)
 * TUYỆT ĐỐI không dùng [class*="eclick"] (tránh khớp nhầm nút oneclick-buy trên Shopee/Lazada/Tiki)
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
 * Chỉ ẩn các khung quảng cáo thật sự, TUYỆT ĐỐI không làm mất #masthead-container, #search hay logo
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
 * Lấy danh sách selector an toàn tùy biến theo từng domain
 */
export function getSelectorsForDomain(domain?: string): readonly string[] {
  const clean = (domain || '').toLowerCase().replace(/^www\./, '');
  if (clean === 'youtube.com' || clean.endsWith('.youtube.com')) {
    return YOUTUBE_AD_SELECTORS;
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
  min-height: 0 !important;
  height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  opacity: 0 !important;
  visibility: hidden !important;
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
