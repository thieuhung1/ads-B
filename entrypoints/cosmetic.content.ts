import { defineContentScript } from 'wxt/utils/define-content-script';
import { CosmeticEngine } from '../src/content/cosmetic-engine';
import { ElementPicker } from '../src/content/element-picker';
import { getCosmeticStylesheetForDomain, GAMBLING_KEYWORDS } from '../src/cosmetic';
import { getWhitelist } from '../src/storage';
import { extractNormalizedDomain } from '../src/domain';

const STYLE_ELEMENT_ID = 'blockads-cosmetic-stylesheet';

function injectCosmeticCSS(cssText: string): void {
  if (!cssText) return;
  let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    (document.head || document.documentElement)?.appendChild(styleEl);
  }
  styleEl.textContent = cssText;
}

/**
 * Quét và tiêu diệt triệt để các banner cờ bạc tự chế + Phá khóa Anti-Adblock modal
 */
function cleanGamblingAdsAndAntiAdblock(): void {
  // 1. Quét và ẩn các thẻ <a> hoặc <img> dẫn tới link cờ bạc / chứa ảnh cờ bạc
  const linksAndImages = document.querySelectorAll<HTMLElement>(
    'a[target="_blank"], a[href], img[src*=".gif"], img[src*=".webp"], img[src*=".png"], img[src*=".jpg"]'
  );

  linksAndImages.forEach((el) => {
    const href = (el.getAttribute('href') || '').toLowerCase();
    const src = (el.getAttribute('src') || '').toLowerCase();
    const alt = (el.getAttribute('alt') || '').toLowerCase();
    const title = (el.getAttribute('title') || '').toLowerCase();
    const combined = `${href} ${src} ${alt} ${title}`;

    if (GAMBLING_KEYWORDS.some((kw) => combined.includes(kw))) {
      const container = el.closest('a') || el;
      container.style.setProperty('display', 'none', 'important');
      container.style.setProperty('visibility', 'hidden', 'important');
      container.style.setProperty('height', '0', 'important');
      container.style.setProperty('pointer-events', 'none', 'important');
    }
  });

  // 2. Gỡ bỏ thông báo "Phát hiện trình chặn quảng cáo" (Anti-Adblock Modal/Overlay)
  const allBlocks = document.querySelectorAll<HTMLElement>('div, section, aside, dialog');
  allBlocks.forEach((block) => {
    const text = (block.innerText || '').toLowerCase();
    if (
      (text.includes('phát hiện trình chặn quảng cáo') ||
        text.includes('vui lòng tắt tiện ích chặn quảng cáo') ||
        text.includes('adblock detected') ||
        text.includes('disable adblock')) &&
      block.offsetHeight < 700
    ) {
      const computed = window.getComputedStyle(block);
      if (
        block.classList.contains('modal') ||
        block.classList.contains('popup') ||
        block.classList.contains('swal2-container') ||
        computed.position === 'fixed' ||
        computed.position === 'absolute' ||
        computed.zIndex > '100'
      ) {
        block.style.setProperty('display', 'none', 'important');
        block.style.setProperty('visibility', 'hidden', 'important');
        // Cho phép cuộn lại body nếu trang web cố tình khóa cuộn (overflow: hidden)
        document.body?.style?.removeProperty('overflow');
        document.documentElement?.style?.removeProperty('overflow');
      }
    }
  });
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  allFrames: true,
  async main() {
    const cosmeticEngine = CosmeticEngine.getInstance();
    const elementPicker = ElementPicker.getInstance();
    const currentDomain = extractNormalizedDomain(window.location.hostname) || '';

    // Miễn trừ YouTube vì đã có cơ chế bảo vệ masthead riêng
    if (currentDomain === 'youtube.com' || currentDomain.endsWith('.youtube.com')) {
      return;
    }

    const whitelist = await getWhitelist();
    const isWhitelisted = whitelist.some((w) => currentDomain === w || currentDomain.endsWith(`.${w}`));
    if (isWhitelisted) return;

    // 1. Tiêm stylesheet thông minh (hạn chế bẫy mồi nhử trên animevietsub)
    const css = getCosmeticStylesheetForDomain(currentDomain, whitelist);
    injectCosmeticCSS(css);

    // 2. Kích hoạt quét dọn banner cờ bạc và gỡ bỏ Anti-Adblock
    const runCleaners = () => {
      cleanGamblingAdsAndAntiAdblock();
      cosmeticEngine.startObserver(currentDomain);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        runCleaners();
        setTimeout(cleanGamblingAdsAndAntiAdblock, 1500);
        setTimeout(cleanGamblingAdsAndAntiAdblock, 3000);
      });
    } else {
      runCleaners();
      setTimeout(cleanGamblingAdsAndAntiAdblock, 1500);
      setTimeout(cleanGamblingAdsAndAntiAdblock, 3000);
    }

    // 3. Lắng nghe các lệnh từ Popup hoặc Background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
            const newCss = getCosmeticStylesheetForDomain(currentDomain, whitelist);
            injectCosmeticCSS(newCss);
            cosmeticEngine.startObserver(currentDomain);
          } else {
            const el = document.getElementById(STYLE_ELEMENT_ID);
            if (el) el.remove();
            cosmeticEngine.stopObserver();
          }
          sendResponse({ success: true });
          break;

        case 'GET_COSMETIC_STATUS':
          sendResponse({
            success: true,
            hiddenCount: cosmeticEngine.getHiddenCount(),
            tempSelectors: cosmeticEngine.getTempSelectors(),
            domain: currentDomain
          });
          break;
      }

      return true;
    });
  }
});
