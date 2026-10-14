import { describe, it, expect } from 'vitest';
import { extractNormalizedDomain, isDomainWhitelisted } from '../../src/domain';

describe('Domain Module (src/domain.ts)', () => {
  it('chuẩn hóa URL và bóc tách domain chính xác', () => {
    expect(extractNormalizedDomain('https://www.vnexpress.net/thoi-su')).toBe('vnexpress.net');
    expect(extractNormalizedDomain('http://dantri.com.vn:8080/path?query=1')).toBe('dantri.com.vn');
    expect(extractNormalizedDomain('facebook.com')).toBe('facebook.com');
    expect(extractNormalizedDomain('WWW.YOUTUBE.COM')).toBe('youtube.com');
    expect(extractNormalizedDomain('sub.domain.vnexpress.net')).toBe('sub.domain.vnexpress.net');
    expect(extractNormalizedDomain('localhost')).toBe('localhost');
  });

  it('bỏ qua và trả về null cho các giao thức nội bộ và URL không hợp lệ', () => {
    expect(extractNormalizedDomain('chrome://extensions')).toBeNull();
    expect(extractNormalizedDomain('edge://settings')).toBeNull();
    expect(extractNormalizedDomain('about:blank')).toBeNull();
    expect(extractNormalizedDomain('file:///C:/test.html')).toBeNull();
    expect(extractNormalizedDomain('')).toBeNull();
    expect(extractNormalizedDomain('   ')).toBeNull();
    expect(extractNormalizedDomain(null)).toBeNull();
    expect(extractNormalizedDomain(undefined)).toBeNull();
  });

  it('kiểm tra domain whitelisted chính xác cả domain con', () => {
    const whitelist = ['vnexpress.net', 'google.com'];

    expect(isDomainWhitelisted('vnexpress.net', whitelist)).toBe(true);
    expect(isDomainWhitelisted('https://vnexpress.net/tin-tuc', whitelist)).toBe(true);
    expect(isDomainWhitelisted('video.vnexpress.net', whitelist)).toBe(true);
    expect(isDomainWhitelisted('google.com', whitelist)).toBe(true);
    expect(isDomainWhitelisted('mail.google.com', whitelist)).toBe(true);

    expect(isDomainWhitelisted('dantri.com.vn', whitelist)).toBe(false);
    expect(isDomainWhitelisted('fakevnexpress.net', whitelist)).toBe(false);
    expect(isDomainWhitelisted('notgoogle.com', whitelist)).toBe(false);
  });
});
