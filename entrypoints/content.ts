import { defineContentScript } from 'wxt/utils/define-content-script';
import { CosmeticEngine } from '../src/content/cosmetic-engine';
import { ElementPicker } from '../src/content/element-picker';
import { getCosmeticStylesheetForDomain } from '../src/cosmetic';
import { getWhitelist } from '../src/storage';
import { extractNormalizedDomain } from '../src/domain';

const STYLE_ELEMENT_ID = 'blockads-cosmetic-style';

// Từ khóa nhận diện link/ảnh cờ bạc
const GAMBLING_PATTERNS = [
  'vsbet', 'vivu88', 'rikvip', 'nhatvip', 'win79', 'sunwin', 'sun.win',
  'go88', 'b52', '789club', 'hitclub', 'kubet', 'f8bet', 'shbet',
  'hi88', 'new88', 'jun88', 'mb66', 'ok9', '8xbet', '188bet', 'w88',
  'm88', 'fb88', 'fun88', 'vn88', 'bk8', 'dafabet', 'cmd368', 'tx88',
  'taixiu', 'nohu', 'nhacai', 'cacuoc', 'casino', 'bet', 'vip'
];

/**
 * Ẩn phần tử an toàn (Visual Collapse): Vừa biến mất hoàn toàn trên giao diện,
 * vừa né được lệnh kiểm tra display:none của script Anti-Adblock!
 */
function stealthHideElement(el: HTMLElement | null): void {
  if (!el || el.dataset.blockadsHidden === 'true') return;
  el.dataset.blockadsHidden = 'true';
  el.style.setProperty('opacity', '0', 'important');
  el.style.setProperty('max-height', '0px', 'important');
  el.style.setProperty('height', '0px', 'important');
  el.style.setProperty('min-height', '0px', 'important');
  el.style.setProperty('margin', '0px', 'important');
  el.style.setProperty('padding', '0px', 'important');
  el.style.setProperty('overflow', 'hidden', 'important');
  el.style.setProperty('pointer-events', 'none', 'important');
  el.style.setProperty('border', 'none', 'important');
}

/**
 * Quét sạch mọi banner cờ bạc (kể cả ảnh từ kho trung gian imgur/ibb) trên các trang phim
 */
function cleanGamblingBannersOnPage(): void {
  const currentHost = window.location.hostname.toLowerCase();
  const isMovieSite = currentHost.includes('animevietsub') || currentHost.includes('rophim') || currentHost.includes('motchill');

  // 1. Quét toàn bộ các thẻ <a> dẫn ra ngoài (external links) hoặc mở tab mới (target="_blank") chứa ảnh banner
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href]');
  links.forEach((link) => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    const img = link.querySelector('img');

    // Bỏ qua các link chức năng hợp lệ của trang
    const isSocialGroup = href.includes('facebook.com/groups') || href.includes('youtube.com') || href.includes('discord.gg');

    // Kiểm tra xem URL đích hoặc ảnh bên trong có khớp từ khóa cờ bạc không
    const imgSrc = (img?.getAttribute('src') || img?.getAttribute('data-src') || '').toLowerCase();
    const imgAlt = (img?.getAttribute('alt') || '').toLowerCase();
    const combinedText = `${href} ${imgSrc} ${imgAlt}`;

    const matchesGamblingKeyword = GAMBLING_PATTERNS.some((kw) => combinedText.includes(kw));

    // Trên trang phim như animevietsub: Mọi thẻ <a target="_blank" rel="nofollow"> bọc ảnh GIF/Banner đều là quảng cáo cờ bạc!
    const isExternalAdBannerOnMovieSite =
      isMovieSite &&
      img !== null &&
      !isSocialGroup &&
      (link.target === '_blank' ||
        (link.rel && link.rel.includes('nofollow')) ||
        imgSrc.endsWith('.gif') ||
        (href.startsWith('http') && !href.includes(currentHost)));

    if (matchesGamblingKeyword || isExternalAdBannerOnMovieSite) {
      stealthHideElement(link);
      if (img) stealthHideElement(img);
      // Nếu thẻ <a> nằm trong một khung chỉ chứa quảng cáo thì thu gọn cả khung đó
      const parent = link.parentElement;
      if (parent && parent.children.length <= 2 && !parent.querySelector('video, iframe')) {
        stealthHideElement(parent);
      }
    }
  });

  // 2. Xử lý thanh quảng cáo cờ bạc bám dính dưới đáy màn hình (Catfish banner như WIN79 / SUN.WIN có nút X đỏ)
  const allElements = document.querySelectorAll<HTMLElement>('div, aside, section');
  allElements.forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'sticky') {
      const bottomVal = parseInt(style.bottom || '999', 10);
      // Nếu là thanh bám ở đáy màn hình (bottom <= 20px) và có chứa ảnh banner hoặc nút đóng 'X'
      if (bottomVal <= 20 && el.offsetHeight > 30 && el.offsetHeight < 250) {
        const hasBannerImg = el.querySelector('img') !== null;
        const hasExternalLink = el.querySelector('a[target="_blank"], a[href^="http"]') !== null;
        if (hasBannerImg || hasExternalLink) {
          stealthHideElement(el);
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
    (document.head || document.documentElement)?.appendChild(styleEl);
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
    const hostname = extractNormalizedDomain(window.location.hostname) || '';
    if (!hostname) return;

    // Miễn trừ YouTube vì có cơ chế masthead riêng
    if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
      return;
    }

    const whitelist = await getWhitelist();
    const isWhitelisted = whitelist.some((w) => hostname === w || hostname.endsWith(`.${w}`));
    if (isWhitelisted) return;

    // Không tiêm CSS .ad-banner mặc định trên animevietsub để tránh chạm vào phần tử mồi nhử (bait) của Anti-Adblock
    if (!hostname.includes('animevietsub')) {
      const css = getCosmeticStylesheetForDomain(hostname, whitelist);
      injectCosmeticCSS(css);
    }

    // Chạy bộ quét diệt banner cờ bạc liên tục khi trang đang tải và khi DOM thay đổi
    const runCleaner = () => cleanGamblingBannersOnPage();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runCleaner);
    } else {
      runCleaner();
    }

    window.addEventListener('load', runCleaner);

    // Theo dõi nếu trang tự chèn thêm banner cờ bạc sau vài giây (như WIN79 ở đáy trang)
    const observer = new MutationObserver(() => {
      cleanGamblingBannersOnPage();
    });

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
            cleanGamblingBannersOnPage();
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
