import { describe, it, expect, beforeEach } from 'vitest';
import { CosmeticEngine, ALL_COSMETIC_SELECTORS } from '../../src/content/cosmetic-engine';
import { ElementPicker } from '../../src/content/element-picker';

describe('CosmeticEngine', () => {
  let engine: CosmeticEngine;

  beforeEach(() => {
    engine = CosmeticEngine.getInstance();
    engine.clearTempSelectors();
  });

  it('chứa đầy đủ các selector quảng cáo quốc tế và Việt Nam an toàn', () => {
    expect(ALL_COSMETIC_SELECTORS.length).toBeGreaterThanOrEqual(40);
    expect(ALL_COSMETIC_SELECTORS).toContain('.adsbygoogle');
    expect(ALL_COSMETIC_SELECTORS).toContain('.quang-cao');
    expect(ALL_COSMETIC_SELECTORS).toContain('.ad-banner');
    expect(ALL_COSMETIC_SELECTORS).toContain('[id^="eclick-"]');
    expect(ALL_COSMETIC_SELECTORS).toContain('[id^="admicro-"]');
  });

  it('tuyệt đối không chặn nhầm các thành phần hợp lệ (Chống False-Positive)', () => {
    // 1. Kiểm tra không chặn các container loading/upload/download của website
    const loadContainer = document.createElement('div');
    loadContainer.className = 'load-container upload-wrapper download-box';
    expect(engine.matchesAdSelector(loadContainer)).toBe(false);

    // 2. Kiểm tra không chặn nút mua hàng 1 chạm "oneclick-buy" của sàn TMĐT
    const oneClickBtn = document.createElement('button');
    oneClickBtn.className = 'btn-oneclick-buy';
    expect(engine.matchesAdSelector(oneClickBtn)).toBe(false);

    // 3. Kiểm tra không chặn nút đăng nhập Microsoft Azure AD / Single Sign-On
    const azureLogin = document.createElement('div');
    azureLogin.id = 'azure-ad-login-btn';
    expect(engine.matchesAdSelector(azureLogin)).toBe(false);

    // 4. Nhưng phải chặn chính xác quảng cáo thật
    const realAd1 = document.createElement('ins');
    realAd1.className = 'adsbygoogle';
    expect(engine.matchesAdSelector(realAd1)).toBe(true);

    const realAd2 = document.createElement('div');
    realAd2.id = 'eclick-zone-123';
    expect(engine.matchesAdSelector(realAd2)).toBe(true);
  });

  it('bảo vệ tuyệt đối thanh tìm kiếm và giao diện YouTube, chỉ ẩn ad chuyên biệt', () => {
    // 1. YouTube masthead container, searchbox, và navbar không bao giờ bị ẩn
    const mastheadContainer = document.createElement('div');
    mastheadContainer.id = 'masthead-container';
    expect(engine.matchesAdSelector(mastheadContainer, 'youtube.com')).toBe(false);

    const searchBox = document.createElement('div');
    searchBox.id = 'search';
    expect(engine.matchesAdSelector(searchBox, 'youtube.com')).toBe(false);

    const masthead = document.createElement('ytd-masthead');
    masthead.id = 'masthead';
    expect(engine.matchesAdSelector(masthead, 'youtube.com')).toBe(false);

    // 2. Nhưng vẫn ẩn đúng quảng cáo thật trên YouTube
    const mastheadAd = document.createElement('div');
    mastheadAd.id = 'masthead-ad';
    expect(engine.matchesAdSelector(mastheadAd, 'youtube.com')).toBe(true);

    const ytAdSlot = document.createElement('ytd-ad-slot-renderer');
    expect(engine.matchesAdSelector(ytAdSlot, 'youtube.com')).toBe(true);

    const videoAds = document.createElement('div');
    videoAds.className = 'video-ads';
    expect(engine.matchesAdSelector(videoAds, 'youtube.com')).toBe(true);
  });

  it('tạo chuỗi CSS ẩn triệt để không để lại khoảng trống', () => {
    const css = engine.generateCss(['.ad-slot', '.banner-ad']);
    expect(css).toContain('display: none !important');
    expect(css).toContain('min-height: 0 !important');
    expect(css).toContain('height: 0 !important');
    expect(css).toContain('opacity: 0 !important');
    expect(css).toContain('.ad-slot');
    expect(css).toContain('.banner-ad');
  });

  it('tối ưu truy vấn đơn (Single-pass query) kết hợp đầy đủ', () => {
    const combined = engine.getCombinedSelector();
    expect(combined).toContain('.adsbygoogle');
    expect(combined).toContain('.quang-cao');
    expect(combined.split(',').length).toBe(ALL_COSMETIC_SELECTORS.length);
  });

  it('quản lý danh sách temporary selectors chính xác', () => {
    engine.addTempSelector('.custom-annoying-banner');
    expect(engine.getTempSelectors()).toContain('.custom-annoying-banner');

    engine.addTempSelector('#popup-newsletter');
    expect(engine.getTempSelectors().length).toBe(2);

    engine.clearTempSelectors();
    expect(engine.getTempSelectors().length).toBe(0);
  });
});

describe('ElementPicker', () => {
  let picker: ElementPicker;

  beforeEach(() => {
    picker = ElementPicker.getInstance();
    document.body.innerHTML = '';
  });

  it('sinh selector chuẩn khi element có ID hợp lệ', () => {
    const div = document.createElement('div');
    div.id = 'sticky-top-ad';
    document.body.appendChild(div);

    const selector = picker.generateSelector(div);
    expect(selector).toBe('#sticky-top-ad');
  });

  it('sinh selector chuẩn khi element có class đặc trưng', () => {
    const div = document.createElement('div');
    div.className = 'ad-sponsor-container active';
    document.body.appendChild(div);

    const selector = picker.generateSelector(div);
    expect(selector).toContain('.ad-sponsor-container');
    expect(selector).not.toContain('.active'); // Loại bỏ utility class
  });

  it('sinh selector theo data attribute', () => {
    const div = document.createElement('div');
    div.setAttribute('data-adunit', 'sidebar-300x250');
    document.body.appendChild(div);

    const selector = picker.generateSelector(div);
    expect(selector).toBe('div[data-adunit="sidebar-300x250"]');
  });
});
