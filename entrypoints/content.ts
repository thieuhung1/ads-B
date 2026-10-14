import { defineContentScript } from 'wxt/utils/define-content-script';
import { GAMBLING_KEYWORDS, SAFE_EXTERNAL_DOMAINS } from '../src/constants';
import { getCosmeticStylesheetForDomain } from '../src/cosmetic';
import { getStorageData, normalizeDomain } from '../src/storage';
import { CosmeticEngine } from '../src/content/cosmetic-engine';
import { ElementPicker } from '../src/content/element-picker';

const STYLE_ELEMENT_ID = 'blockads-cosmetic-style';

function collapseAdElement(el: HTMLElement | null): void {
  if (!el || el.dataset.blockadsCleaned === '1') return;
  if (el.tagName === 'VIDEO' || el.querySelector('video')) return;

  el.dataset.blockadsCleaned = '1';
  el.style.setProperty('display', 'none', 'important');
  el.style.setProperty('visibility', 'hidden', 'important');
  el.style.setProperty('opacity', '0', 'important');
  el.style.setProperty('height', '0px', 'important');
  el.style.setProperty('max-height', '0px', 'important');
  el.style.setProperty('width', '0px', 'important');
  el.style.setProperty('margin', '0px', 'important');
  el.style.setProperty('padding', '0px', 'important');
  el.style.setProperty('pointer-events', 'none', 'important');
  el.style.setProperty('z-index', '-9999', 'important');
}

function isSafeSocialUrl(href: string): boolean {
  return SAFE_EXTERNAL_DOMAINS.some((domain) => href.includes(domain));
}

function isAdCloseButtonText(text: string): boolean {
  const clean = text.trim().toLowerCase();
  return (
    clean === 'đóng quảng cáo' ||
    clean === 'đóng và xem tiếp' ||
    clean === 'bỏ qua quảng cáo' ||
    clean === 'skip ad'
  );
}

// Tự động tìm và ẩn lớp phủ chứa nút "Đóng quảng cáo" / "Đóng và xem tiếp" trên trình phát video
function removeInPlayerAdOverlay(): void {
  const elements = document.querySelectorAll<HTMLElement>(
    'button, a, div, span'
  );

  elements.forEach((el) => {
    if (el.dataset.blockadsCleaned === '1') return;
    const text = (el.textContent || '').trim();
    if (!isAdCloseButtonText(text)) return;

    if (el instanceof HTMLAnchorElement) {
      el.removeAttribute('href');
      el.removeAttribute('target');
    }

    let overlayContainer: HTMLElement | null = el;
    let parent = el.parentElement;

    while (
      parent &&
      parent !== document.body &&
      !parent.querySelector('video') &&
      parent.offsetHeight <= 800
    ) {
      overlayContainer = parent;
      parent = parent.parentElement;
    }

    collapseAdElement(overlayContainer);
    collapseAdElement(el);

    const video = document.querySelector('video');
    if (video && video.paused && video.currentTime > 0) {
      video.play().catch(() => {});
    }
  });
}

function sweepGamblingBanners(): void {
  const currentHost = window.location.hostname.toLowerCase();
  const isMovieContext =
    currentHost.includes('animevietsub') || window.self !== window.top;

  removeInPlayerAdOverlay();

  // 1. Quét toàn bộ các thẻ <a> chứa banner cờ bạc hoặc lớp phủ bẫy click trong suốt
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

    const hasGamblingKeyword = GAMBLING_KEYWORDS.some((kw) =>
      combined.includes(kw)
    );

    const isExternalMovieBanner =
      isMovieContext &&
      !isSafeSocialUrl(href) &&
      ((img !== null &&
        (imgSrc.includes('.gif') ||
          link.target === '_blank' ||
          link.rel.includes('nofollow') ||
          (href.startsWith('http') && !href.includes(currentHost)))) ||
        (link.target === '_blank' &&
          !href.includes(currentHost) &&
          window.getComputedStyle(link).position === 'absolute'));

    if (hasGamblingKeyword || isExternalMovieBanner) {
      link.removeAttribute('href');
      link.removeAttribute('target');
      collapseAdElement(link);
      const wrapper = link.parentElement;
      if (
        wrapper &&
        wrapper.children.length <= 2 &&
        wrapper.tagName !== 'BODY' &&
        !wrapper.querySelector('video')
      ) {
        collapseAdElement(wrapper);
      }
    }
  });

  // 2. Ẩn các khung quảng cáo bám đáy màn hình (Catfish) và nút [X] đỏ góc dưới bên phải
  const floatingElements = document.querySelectorAll<HTMLElement>(
    'div, aside, section, footer, span, a'
  );
  floatingElements.forEach((el) => {
    if (el.dataset.blockadsCleaned === '1') return;
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'sticky') {
      const bottom = parseInt(style.bottom || '999', 10);
      const zIndex = parseInt(style.zIndex || '0', 10);
      const text = (el.textContent || '').trim().toLowerCase();

      if (bottom <= 60 && zIndex >= 10 && el.offsetHeight < 350) {
        const isFakeCloseBtn = text === 'x' || text === '×' || text === 'đóng';
        const hasAdMedia =
          el.querySelector(
            'img, iframe, a[target="_blank"], a[rel*="nofollow"]'
          ) !== null;

        if (isFakeCloseBtn || hasAdMedia) {
          collapseAdElement(el);
        }
      }
    }
  });
}

function injectCosmeticCSS(cssText: string): void {
  if (!cssText) return;
  let styleEl = document.getElementById(
    STYLE_ELEMENT_ID
  ) as HTMLStyleElement | null;
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
  allFrames: true,
  async main() {
    const cosmeticEngine = CosmeticEngine.getInstance();
    const elementPicker = ElementPicker.getInstance();

    const rawHost = window.location.hostname || '';
    const hostname = normalizeDomain(rawHost);

    // Miễn trừ YouTube vì có cơ chế player riêng
    if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
      return;
    }

    const { whitelist } = await getStorageData();
    if (hostname) {
      const isWhitelisted = whitelist.some(
        (w) => hostname === w || hostname.endsWith(`.${w}`)
      );
      if (isWhitelisted) return;
    }

    // Chặn toàn bộ sự kiện nhấn chuột (pointerdown, mousedown, click) vào nút "Đóng quảng cáo"
    // ngay ở pha Capture trước khi trang web kịp nhảy sang link quảng cáo
    const interceptAdButtonEvents = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const text = (target.textContent || '').trim();
      if (isAdCloseButtonText(text)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        removeInPlayerAdOverlay();
      }
    };

    window.addEventListener('pointerdown', interceptAdButtonEvents, true);
    window.addEventListener('mousedown', interceptAdButtonEvents, true);
    window.addEventListener('click', interceptAdButtonEvents, true);

    if (hostname) {
      const css = getCosmeticStylesheetForDomain(hostname, whitelist);
      injectCosmeticCSS(css);
    }

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
      const root = document.body || document.documentElement;
      if (root) {
        observer.observe(root, { childList: true, subtree: true });
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
