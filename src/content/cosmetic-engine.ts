/**
 * Danh sách selector quảng cáo toàn cầu - Độ chính xác cao (Zero False-Positive)
 * TUYỆT ĐỐI không dùng wildcard substring nguy hiểm như:
 * - [class*="ad-container"] (khớp nhầm upload-container, load-container, read-container)
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

  // Chuẩn Semantic Ad Classes (khớp chính xác class để tránh ẩn nhầm container hệ thống)
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

  // Safe Prefix ID/Class Selectors có phân tách rõ ràng
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
 * TUYỆT ĐỐI không dùng [class*="eclick"] (khớp nhầm oneclick-buy trên Shopee/Lazada/Tiki)
 * TUYỆT ĐỐI không dùng .qc-container (khớp nhầm Quality Control container trong admin/tool)
 */
export const VN_AD_SELECTORS: readonly string[] = [
  // Tiếng Việt định danh rõ ràng
  '.quang-cao',
  '.qc-banner',
  '.box-quangcao',
  '.banner-adv',
  '.adv-banner',
  '.box-adv',

  // Admicro (VCCorp) - dùng prefix an toàn
  '[id^="admicro_"]',
  '[id^="admicro-"]',
  '[class^="admicro_"]',
  '[class^="admicro-"]',
  '.ambient-ad',
  '.vcc-ad',

  // eClick (FPT) - dùng prefix an toàn để không chặn nút "oneclick-buy"
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
];

/**
 * Danh sách selector chuyên biệt cho YouTube
 * Chỉ ẩn các khung quảng cáo thật sự, TUYỆT ĐỐI không làm mất #masthead-container, thanh tìm kiếm #search hay logo
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

const STYLE_ELEMENT_ID = 'blockads-cosmetic-stylesheet';
const TEMP_STYLE_ELEMENT_ID = 'blockads-temp-stylesheet';

export class CosmeticEngine {
  private static instance: CosmeticEngine;
  private observer: MutationObserver | null = null;
  private isEnabled: boolean = false;
  private hiddenCount: number = 0;
  private debounceTimer: number | null = null;
  private tempRules: string[] = [];
  private currentDomain: string = '';

  private constructor() {}

  public static getInstance(): CosmeticEngine {
    if (!CosmeticEngine.instance) {
      CosmeticEngine.instance = new CosmeticEngine();
    }
    return CosmeticEngine.instance;
  }

  /**
   * Lấy danh sách selector an toàn theo từng domain
   */
  public getSelectorsForDomain(domain?: string): readonly string[] {
    const raw = domain || this.currentDomain || (typeof window !== 'undefined' ? window.location.hostname : '');
    const clean = raw.toLowerCase().replace(/^www\./, '');
    if (clean === 'youtube.com' || clean.endsWith('.youtube.com')) {
      return YOUTUBE_AD_SELECTORS;
    }
    return ALL_COSMETIC_SELECTORS;
  }

  /**
   * Tạo chuỗi CSS ẩn phần tử triệt để, thu gọn khung rác không để lại khoảng trống
   */
  public generateCss(selectors: readonly string[]): string {
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
   * Inject stylesheet ẩn quảng cáo tĩnh ngay từ sớm (document_start)
   */
  public injectBaseStylesheet(domain?: string): void {
    if (document.getElementById(STYLE_ELEMENT_ID)) return;

    if (domain) {
      this.currentDomain = domain;
    }

    const selectors = this.getSelectorsForDomain(domain);
    const css = this.generateCss(selectors);
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    styleEl.textContent = css;

    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(styleEl);
    } else {
      // Nếu gọi quá sớm khi head/documentElement chưa có
      document.addEventListener('DOMContentLoaded', () => {
        (document.head || document.documentElement)?.appendChild(styleEl);
      }, { once: true });
    }
    this.isEnabled = true;
  }

  public removeBaseStylesheet(): void {
    const el = document.getElementById(STYLE_ELEMENT_ID);
    if (el) el.remove();
    this.isEnabled = false;
  }

  /**
   * Thêm rule ẩn phần tử tạm thời do người dùng chọn (Element Picker)
   */
  public addTempSelector(selector: string): void {
    if (!this.tempRules.includes(selector)) {
      this.tempRules.push(selector);
    }

    let tempStyle = document.getElementById(TEMP_STYLE_ELEMENT_ID) as HTMLStyleElement | null;
    if (!tempStyle) {
      tempStyle = document.createElement('style');
      tempStyle.id = TEMP_STYLE_ELEMENT_ID;
      (document.head || document.documentElement)?.appendChild(tempStyle);
    }

    tempStyle.textContent = this.generateCss(this.tempRules);

    // Cũng ẩn các phần tử hiện tại ngay lập tức
    try {
      document.querySelectorAll(selector).forEach(el => {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      });
    } catch {
      // Ignored
    }
  }

  public clearTempSelectors(): void {
    this.tempRules = [];
    if (typeof document !== 'undefined') {
      const el = document.getElementById(TEMP_STYLE_ELEMENT_ID);
      if (el) el.remove();
    }
  }

  public getTempSelectors(): string[] {
    return [...this.tempRules];
  }

  /**
   * Bắt các DOM node động được tải bất đồng bộ (Lazy loading ads)
   */
  public startObserver(domain?: string): void {
    if (this.observer) return;

    if (domain) {
      this.currentDomain = domain;
    }

    this.observer = new MutationObserver((mutations) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = window.setTimeout(() => {
        this.processMutations(mutations);
      }, 100);
    });

    // Chỉ observe childList và subtree để đảm bảo 60fps mượt mà
    const target = document.body || document.documentElement;
    if (target) {
      this.observer.observe(target, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });
    }

    // Tự động tạm dừng khi chuyển tab để tiết kiệm CPU và pin
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.stopObserver();
    } else if (this.isEnabled) {
      this.startObserver(this.currentDomain);
    }
  };

  public stopObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private processMutations(mutations: MutationRecord[]): void {
    let newHidden = 0;
    const combined = this.getCombinedSelector();

    for (const mutation of mutations) {
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        const node = mutation.addedNodes[i];
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;

          // Kiểm tra bản thân node mới
          if (this.matchesAdSelector(el)) {
            el.style.setProperty('display', 'none', 'important');
            newHidden++;
          }

          // Quét nhanh các con bên trong chỉ bằng 1 lần queryAll duy nhất thay vì lặp từng selector
          try {
            const children = el.querySelectorAll(combined);
            children.forEach(child => {
              (child as HTMLElement).style.setProperty('display', 'none', 'important');
              newHidden++;
            });
          } catch {
            // Fallback nếu selector query lỗi
          }
        }
      }
    }

    if (newHidden > 0) {
      this.hiddenCount += newHidden;
    }
  }

  private combinedSelectorCache: Map<string, string> = new Map();

  public getCombinedSelector(domain?: string): string {
    const raw = domain || this.currentDomain || (typeof window !== 'undefined' ? window.location.hostname : '');
    const clean = raw.toLowerCase().replace(/^www\./, '');
    const isYt = clean === 'youtube.com' || clean.endsWith('.youtube.com');
    const key = isYt ? 'youtube' : 'global';

    if (!this.combinedSelectorCache.has(key)) {
      const selectors = this.getSelectorsForDomain(clean);
      this.combinedSelectorCache.set(key, selectors.join(','));
    }
    return this.combinedSelectorCache.get(key)!;
  }

  public matchesAdSelector(el: Element, domain?: string): boolean {
    const combined = this.getCombinedSelector(domain);
    try {
      return el.matches(combined);
    } catch {
      const selectors = this.getSelectorsForDomain(domain);
      return selectors.some(selector => {
        try {
          return el.matches(selector);
        } catch {
          return false;
        }
      });
    }
  }

  public getHiddenCount(): number {
    return this.hiddenCount;
  }
}

export default CosmeticEngine;
