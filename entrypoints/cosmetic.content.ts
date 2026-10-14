import { defineContentScript } from 'wxt/utils/define-content-script';
import { CosmeticEngine } from '../src/content/cosmetic-engine';
import { ElementPicker } from '../src/content/element-picker';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  allFrames: true,
  main() {
    const cosmeticEngine = CosmeticEngine.getInstance();
    const elementPicker = ElementPicker.getInstance();
    const currentDomain = window.location.hostname.replace(/^www\./, '');

    // YouTube là ứng dụng Polymer SPA phức tạp với cấu trúc Custom Elements nhạy cảm.
    // Theo đúng lộ trình Tuần 4, YouTube sẽ có chế độ YouTube Mode chuyên sâu riêng.
    // Tại Tuần 2, miễn trừ hoàn toàn YouTube để đảm bảo 100% thanh tìm kiếm, logo và giao diện YouTube không bị ảnh hưởng.
    if (currentDomain === 'youtube.com' || currentDomain.endsWith('.youtube.com')) {
      return;
    }

    // 1. Chống giật màn hình (Anti-flicker) bằng Optimistic Injection:
    // Ngay tại document_start, inject stylesheet lập tức để browser native engine ẩn quảng cáo trước khi kịp render.
    cosmeticEngine.injectBaseStylesheet(currentDomain);

    // Đồng thời kiểm tra trạng thái Whitelist bất đồng bộ:
    // Nếu trang này được Whitelist, lập tức gỡ bỏ stylesheet và ngắt observer.
    chrome.runtime.sendMessage(
      { type: 'GET_TAB_STATE' },
      (response) => {
        if (chrome.runtime.lastError) return;

        const isWhitelisted = response?.tabState?.isWhitelisted ?? false;
        if (isWhitelisted) {
          // Trang nằm trong Whitelist -> gỡ bỏ CSS và không observe
          cosmeticEngine.removeBaseStylesheet();
          cosmeticEngine.stopObserver();
        } else {
          // Tiếp tục bảo vệ: Bật MutationObserver khi DOM bắt đầu render
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
              cosmeticEngine.startObserver(currentDomain);
            });
          } else {
            cosmeticEngine.startObserver(currentDomain);
          }
        }
      }
    );

    // 2. Lắng nghe các lệnh từ Popup hoặc Background
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
            cosmeticEngine.injectBaseStylesheet(currentDomain);
            cosmeticEngine.startObserver(currentDomain);
          } else {
            cosmeticEngine.removeBaseStylesheet();
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
