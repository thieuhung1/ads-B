import { GAMBLING_KEYWORDS as CONST_GAMBLING_KEYWORDS } from './constants';
import { normalizeDomain } from './storage';

export const GAMBLING_KEYWORDS = CONST_GAMBLING_KEYWORDS;

const GAMBLING_ATTR_SELECTORS: string[] = [
  'a[href*="vsbet"]',
  'a[href*="vivu88"]',
  'a[href*="rikvip"]',
  'a[href*="nhatvip"]',
  'img[src*="vsbet"]',
  'img[src*="vivu88"]',
  'img[src*="rikvip"]',
  'img[src*="nhatvip"]',
  'img[alt*="VSbet" i]',
  'img[alt*="Vivu88" i]',
  'img[alt*="Rikvip" i]',
  'img[alt*="Nhatvip" i]',
  ...GAMBLING_KEYWORDS.flatMap((kw) => [
    `a[href*="${kw}" i]`,
    `img[src*="${kw}" i]`,
    `img[alt*="${kw}" i]`,
    `iframe[src*="${kw}" i]`
  ])
];

export const GENERIC_AD_SELECTORS: readonly string[] = Array.from(
  new Set([
    '.ad-banner',
    '.ads-banner',
    '.ad-container',
    '.ads-container',
    '.ad-slot',
    '.ad-wrapper',
    '.advertisement',
    '.sponsored-content',
    'div[id^="google_ads_iframe_"]',
    'iframe[src*="doubleclick.net"]',
    'div[data-ad-slot]',
    'div[class*="qc-banner"]',
    ...GAMBLING_ATTR_SELECTORS
  ])
);

export const SITE_SPECIFIC_SELECTORS: Record<string, string[]> = {
  'vnexpress.net': ['#sis_large1', '.box_qc', '.banner-ads', 'div[id^="ad-"]'],
  'dantri.com.vn': ['.dt-ads', 'div[id^="admzone"]', '.ads-top-banner'],
  'kenh14.vn': ['.k14-ads', 'div[id^="admzone"]', '.adm-sponsored'],
  '24h.com.vn': ['.banner-24h-ads', 'div[id^="banner_"]', '.box-quang-cao'],
  'tuoitre.vn': ['.VCSortableInPreviewMode[type="ads"]', '.box-advertisement'],
  'zingnews.vn': ['.ad-box', '.z-widget-ads'],
  'thanhnien.vn': ['.tn-ads', '.zone-ads'],
  'animevietsub.nl': [
    '#float_ck',
    '#hide_float_ck',
    '.float-ck',
    '.catfish-ads',
    '.ad-top-banner',
    '.header-ads',
    '.widget-ads',
    '.banner-quangcao',
    '.ad-top',
    '.ads-top',
    'div[id*="quangcao"]',
    'div[class*="quangcao"]'
  ]
};

export const GLOBAL_AD_SELECTORS: readonly string[] = GENERIC_AD_SELECTORS;
export const ALL_COSMETIC_SELECTORS: readonly string[] = GENERIC_AD_SELECTORS;
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
];

export function getCosmeticStylesheetForDomain(hostname: string, whitelist: string[] = []): string {
  const domain = normalizeDomain(hostname);
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

  // Trên các trang phim có Anti-Adblock, không áp dụng các class mồi nhử (.ad-banner, .ads-container, iframe)
  // mà chỉ áp dụng bộ lọc cờ bạc (href/img/alt/iframe) và selector đặc thù của trang đó
  const isMovieAntiAdblockSite = domain.includes('animevietsub');
  const baseSelectors = isMovieAntiAdblockSite
    ? GAMBLING_ATTR_SELECTORS
    : GENERIC_AD_SELECTORS;

  const allSelectors = Array.from(new Set([...baseSelectors, ...matchedSiteSelectors]));
  return `${allSelectors.join(',\n')} {\n  display: none !important;\n  visibility: hidden !important;\n  height: 0 !important;\n  min-height: 0 !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  pointer-events: none !important;\n}`;
}

export function getSelectorsForDomain(domain?: string): readonly string[] {
  const clean = (domain || '').toLowerCase().replace(/^www\./, '');
  if (clean === 'youtube.com' || clean.endsWith('.youtube.com')) {
    return YOUTUBE_AD_SELECTORS;
  }
  if (clean.includes('animevietsub')) {
    const siteSpecific = SITE_SPECIFIC_SELECTORS['animevietsub.nl'] || [];
    return [...GAMBLING_ATTR_SELECTORS, ...siteSpecific];
  }
  return GENERIC_AD_SELECTORS;
}

export function generateCss(selectors: readonly string[]): string {
  if (selectors.length === 0) return '';
  return `${selectors.join(',\n')} {\n  display: none !important;\n  visibility: hidden !important;\n  height: 0 !important;\n  min-height: 0 !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  pointer-events: none !important;\n}`;
}

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
