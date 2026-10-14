import { describe, it, expect } from 'vitest';
import {
  getCosmeticStylesheetForDomain,
  matchesAdSelector,
  GAMBLING_KEYWORDS,
  GENERIC_AD_SELECTORS,
  SITE_SPECIFIC_SELECTORS
} from '../../src/cosmetic';

describe('Cosmetic Module with Gambling & Anti-Adblock (src/cosmetic.ts)', () => {
  it('chứa danh sách đầy đủ từ khóa và selector cờ bạc phổ biến tại VN', () => {
    expect(GAMBLING_KEYWORDS).toContain('vsbet');
    expect(GAMBLING_KEYWORDS).toContain('vivu88');
    expect(GAMBLING_KEYWORDS).toContain('rikvip');
    expect(GAMBLING_KEYWORDS).toContain('nhatvip');
    expect(GAMBLING_KEYWORDS).toContain('kubet');
    expect(GAMBLING_KEYWORDS).toContain('8xbet');

    expect(GENERIC_AD_SELECTORS).toContain('a[href*="vsbet"]');
    expect(GENERIC_AD_SELECTORS).toContain('img[src*="vivu88"]');
    expect(GENERIC_AD_SELECTORS).toContain('img[alt*="Rikvip" i]');
  });

  it('nhận diện chính xác link và ảnh banner cờ bạc qua matchesAdSelector', () => {
    const betLink = document.createElement('a');
    betLink.href = 'https://vsbet88.vip/register';
    betLink.setAttribute('href', 'https://vsbet88.vip/register');
    expect(matchesAdSelector(betLink)).toBe(true);

    const betImg = document.createElement('img');
    betImg.setAttribute('src', 'https://cdn.example.com/banners/vivu88-promo.gif');
    expect(matchesAdSelector(betImg)).toBe(true);

    const safeLink = document.createElement('a');
    safeLink.href = 'https://vnexpress.net/thoi-su';
    safeLink.setAttribute('href', 'https://vnexpress.net/thoi-su');
    expect(matchesAdSelector(safeLink)).toBe(false);
  });

  it('trên các trang có Anti-Adblock mạnh như animevietsub, loại bỏ generic bait để tránh bị phát hiện', () => {
    const animevietsubCss = getCosmeticStylesheetForDomain('animevietsub.nl', []);
    expect(animevietsubCss).toContain('a[href*="vsbet"]');
    expect(animevietsubCss).toContain('.widget-ads');
    expect(animevietsubCss).toContain('.banner-quangcao');

    // Không chứa generic iframe hay qc-banner dễ chạm vào bẫy offsetHeight
    expect(animevietsubCss).not.toContain('iframe[src*="doubleclick.net"]');
  });

  it('trả về chuỗi rỗng khi trang web nằm trong whitelist', () => {
    const css = getCosmeticStylesheetForDomain('vnexpress.net', ['vnexpress.net']);
    expect(css).toBe('');
  });
});
