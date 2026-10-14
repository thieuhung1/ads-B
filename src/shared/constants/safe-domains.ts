/**
 * Danh sách các domain an toàn và phổ biến được miễn trừ hoặc tin cậy
 */
export const SAFE_DOMAINS: readonly string[] = [
  'google.com',
  'accounts.google.com',
  'youtube.com',
  'facebook.com',
  'github.com',
  'microsoft.com',
  'apple.com',
  'cloudflare.com',
  'vnexpress.net',
  'dantri.com.vn',
  'tuoitre.vn',
  'znews.vn',
  '24h.com.vn',
  'kenh14.vn',
  'shopee.vn',
  'tiki.vn',
  'lazada.vn'
] as const;

export function isSafeDomain(domain: string): boolean {
  if (!domain) return false;
  const clean = domain.toLowerCase().replace(/^www\./, '');
  return SAFE_DOMAINS.some(safe => clean === safe || clean.endsWith(`.${safe}`));
}

export default SAFE_DOMAINS;
