import { defineContentScript } from 'wxt/utils/define-content-script';
import { GAMBLING_KEYWORDS, SAFE_EXTERNAL_DOMAINS } from '../src/constants';
import { getCosmeticStylesheetForDomain } from '../src/cosmetic';
import { getStorageData, normalizeDomain } from '../src/storage';
import { CosmeticEngine } from '../src/content/cosmetic-engine';
import { ElementPicker } from '../src/content/element-picker';

const STYLE_ELEMENT_ID = 'blockads-cosmetic-style';

// 1. Vô hiệu hóa trình kiểm tra Anti-Adblock trong trang (Giả lập Google Ads luôn tải thành công)
function injectAntiAdblockDefuser(): void {
  try {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        window.canRunAds = true;
        window.isAdBlockActive = false;
        window.google_ad_status = 1;
        var dummy = { loaded: true, push: function() { return 1; } };
        try {
          Object.defineProperty(window, 'adsbygoogle', {
            get: function() { return dummy; },
            set: function() {},
            configurable: true
          });
        } catch (e) {
          window.adsbygoogle = dummy;
        }
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch {
    // Bỏ qua nếu CSP của trang chặn inline script
  }
}

// 2. Ẩn phần tử cờ bạc an toàn không để lại khoảng trống
function collapseAdElement(el: HTMLElement | null): void {
  if (!el || el.dataset.blockadsCleaned === '1') return;
  // Tuyệt đối không bao giờ ẩn nhầm khung chứa trình phát video chính
  if (el.querySelector('video, #player, #media-player, .jwplayer')) return;

  el.dataset.blockadsCleaned = '1';
  el.style.setProperty('display', 'none', 'important');
  el.style.setProperty('visibility', 'hidden', 'important');
  el.style.setProperty('height', '0px', 'important');
  el.style.setProperty('max-height', '0px', 'important');
  el.style.setProperty('margin', '0px', 'important');
  el.style.setProperty('padding', '0px', 'important');
  el.style.setProperty('overflow', 'hidden', 'important');
  el.style.setProperty('pointer-events', 'none', 'important');
}

function isSafeSocialUrl(href: string): boolean {
  return SAFE_EXTERNAL_DOMAINS.some((domain) => href.includes(domain));
}

function sweepGamblingBanners(): void {
  const currentHost = window.location.hostname.toLowerCase();
  const isMovieSite = currentHost.includes('animevietsub');

  // Quét toàn bộ các thẻ <a> có chứa ảnh banner
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href]');
  links.forEach((link) => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    if (!href || href.startsWith('javascript:') || href === '#') return;

    const img = link.querySelector('img');
    const imgSrc = (
      img?.getAttribute('src') ||
      img?.getAttribute('data-src') ||
      img?.getAttribute('data-original') ||
      ''
    ).toLowerCase();
    const imgAlt = (img?.getAttribute('alt') || '').toLowerCase();
    const combined = `${href} ${imgSrc} ${imgAlt}`;

    // Dấu hiệu 1: Khớp trực tiếp tên nhà cái (VSbet, ViVU88, RikVIP, Nhất VIP, WIN79, SUN.WIN...)
    const hasGamblingKeyword = GAMBLING_KEYWORDS.some((kw) => combined.includes(kw));

    // Dấu hiệu 2: Trên trang phim, mọi thẻ <a> mở tab mới (target="_blank" hoặc rel="nofollow")
    // chứa ảnh động .gif hoặc trỏ ra domain ngoài (trừ Group FB/Youtube) đều là banner nhà cái
    const isExternalMovieBanner =
      isMovieSite &&
      img !== null &&
      !isSafeSocialUrl(href) &&
      (imgSrc.includes('.gif') ||
        link.target === '_blank' ||
        link.rel.includes('nofollow') ||
        (href.startsWith('http') && !href.includes(currentHost)));

    if (hasGamblingKeyword || isExternalMovieBanner) {
      collapseAdElement(link);
      const wrapper = link.parentElement;
      if (wrapper && wrapper.children.length <= 2 && wrapper.tagName !== 'BODY') {
        collapseAdElement(wrapper);
      }
    }
  });

  // Quét các thanh quảng cáo cờ bạc bám dính ở đáy màn hình (Catfish banner như WIN79 / SUN.WIN có nút X đỏ)
  const fixedContainers = document.querySelectorAll<HTMLElement>('div, aside, section, footer');
  fixedContainers.forEach((el) => {
    if (el.dataset.blockadsCleaned === '1') return;
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'sticky') {
      const bottom = parseInt(style.bottom || '999', 10);
      const zIndex = parseInt(style.zIndex || '0', 10);
      if (bottom <= 50 && zIndex >= 10 && el.offsetHeight > 25 && el.offsetHeight < 320) {
        const hasAdContent =
          el.querySelector('img[src*=".gif"], a[target="_blank"], a[rel*="nofollow"]') !== null;
        if (hasAdContent) {
          collapseAdElement(el);
        }
      }
    }
  });
}

function injectCosmeticCSS(cssText: string): void {
  if (!cssText) return;
  let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    (document.head || document.documentElement).appendChild(styleEl);
  }
  styleEl.textContent = cssText;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main() {
    const cosmeticEngine = CosmeticEngine.getInstance();
    const elementPicker = ElementPicker.getInstance();

    const hostname = normalizeDomain(window.location.hostname);
    if (!hostname) return;

    // Miễn trừ YouTube vì có cơ chế player riêng
    if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
      return;
    }

    const { whitelist } = await getStorageData();
    const isWhitelisted = whitelist.some((w) => hostname === w || hostname.endsWith(`.${w}`));
    if (isWhitelisted) return;

    injectAntiAdblockDefuser();

    const css = getCosmeticStylesheetForDomain(hostname, whitelist);
    injectCosmeticCSS(css);

    let rafId: number | null = null;
    const scheduleSweep = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        sweepGamblingBanners();
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scheduleSweep);
    } else {
      scheduleSweep();
    }
    window.addEventListener('load', scheduleSweep);

    const observer = new MutationObserver(scheduleSweep);
    const startObserver = () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    };

    if (document.body) {
      startObserver();
    } else {
      document.addEventListener('DOMContentLoaded', startObserver);
    }

    // Lắng nghe các lệnh từ Popup hoặc Background
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.type) {
        case 'START_TEMP_PICKER':
          elementPicker.activate();
          sendResponse({ success: true, message: 'Đã bật Element Picker' });
          break;

        case 'CANCEL_TEMP_PICKER':
          elementPicker.deactivate();
          sendResponse({ success: true, message: 'Đã tắt Element Picker' });
          break;

        case 'RESET_TEMP_HIDDEN':
          cosmeticEngine.clearTempSelectors();
          sendResponse({ success: true, message: 'Đã khôi phục các phần tử ẩn tạm thời' });
          break;

        case 'TOGGLE_COSMETIC':
          if (message.enabled) {
            scheduleSweep();
          }
          sendResponse({ success: true });
          break;

        case 'GET_COSMETIC_STATUS':
          sendResponse({
            success: true,
            hiddenCount: cosmeticEngine.getHiddenCount(),
            tempSelectors: cosmeticEngine.getTempSelectors(),
            domain: hostname
          });
          break;
      }

      return true;
    });
  }
});
