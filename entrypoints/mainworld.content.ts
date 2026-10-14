import { defineContentScript } from 'wxt/utils/define-content-script';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  allFrames: true,
  world: 'MAIN',
  main() {
    // 1. Giả lập các biến toàn cục để vượt qua trình kiểm tra Anti-Adblock
    const win = window as unknown as Record<string, unknown>;
    win.canRunAds = true;
    win.isAdBlockActive = false;
    win.google_ad_status = 1;
    if (!win.adsbygoogle) {
      win.adsbygoogle = { loaded: true, push: () => {} };
    }

    // 2. Khóa lệnh window.open() nhảy sang tab quảng cáo khi bấm "Đóng quảng cáo" trên trang phim
    const host = window.location.hostname.toLowerCase();
    const isMovieOrIframe =
      host.includes('animevietsub') || window.self !== window.top;

    if (isMovieOrIframe) {
      const originalOpen = window.open;
      window.open = function (
        url?: string | URL,
        target?: string,
        features?: string
      ): WindowProxy | null {
        if (!url) return null;
        const urlStr = String(url).toLowerCase();

        // Chỉ cho phép mở nếu URL đích thuộc cùng trang phim hiện tại
        if (host && urlStr.includes(host)) {
          return originalOpen.call(window, url, target, features);
        }
        return null;
      };
    }
  }
});
