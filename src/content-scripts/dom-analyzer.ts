import { SAFE_DOMAINS, isSafeDomain } from '../shared/constants/safe-domains';
import type { DomainAnalysis, AdElementInfo } from '../shared/types';

/**
 * Phân tích cấu trúc DOM để phát hiện và đánh dấu các phần tử quảng cáo
 */
export class DomAnalyzer {
  private adSelectors: string[] = [
    '.adsbygoogle',
    'ins.adsbygoogle',
    '.ad-banner',
    '.ad-container',
    '.ad-slot',
    'div[id^="google_ads_"]',
    'div[id^="div-gpt-ad"]',
    '.banner-ad',
    '.advertisement',
    '[data-adunit]',
    '.quang-cao',
    '.qc-banner',
    '[id^="admicro-"]',
    '[id^="eclick-"]'
  ];

  public analyzeCurrentPage(): DomainAnalysis {
    const currentDomain = window.location.hostname.replace(/^www\./, '');
    const isSafe = isSafeDomain(currentDomain);

    const foundAds = this.scanAdElements();

    return {
      domain: currentDomain,
      isSafe,
      adCount: foundAds.length,
      trackersFound: 0
    };
  }

  public scanAdElements(): AdElementInfo[] {
    const results: AdElementInfo[] = [];

    for (const selector of this.adSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          results.push({
            selector,
            tagName: el.tagName.toLowerCase(),
            id: el.id || undefined,
            className: el.className || undefined
          });
        });
      } catch {
        // Skip invalid selectors
      }
    }

    return results;
  }

  public reportToBackground(): void {
    const analysis = this.analyzeCurrentPage();
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'ANALYZE_DOM',
        data: analysis
      }).catch(() => {
        // Background listener might not be ready
      });
    }
  }
}

export default DomAnalyzer;
