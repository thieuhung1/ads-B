const VALID_WEB_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Trích xuất và chuẩn hóa domain một cách an toàn bằng URL API.
 * Bỏ qua www., loại bỏ cổng (port) hoặc chuỗi truy vấn phức tạp.
 * Bỏ qua các trang nội bộ (chrome://, edge://, about:, file://).
 */
export function extractNormalizedDomain(input: string | undefined | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed);
    const parsed = new URL(hasProtocol ? trimmed : `https://${trimmed}`);

    if (!VALID_WEB_PROTOCOLS.has(parsed.protocol)) {
      return null; // Bỏ qua chrome://, edge://, about:, file://
    }

    const cleanHost = parsed.hostname.replace(/^www\./, '');
    return cleanHost.includes('.') || cleanHost === 'localhost' ? cleanHost : null;
  } catch {
    return null;
  }
}

/**
 * Kiểm tra xem một hostname có nằm trong danh sách Whitelist hay không.
 * Hỗ trợ so khớp chính xác domain hoặc subdomains của whitelist entry.
 */
export function isDomainWhitelisted(hostname: string | undefined | null, whitelist: readonly string[]): boolean {
  const target = extractNormalizedDomain(hostname);
  if (!target) return false;

  return whitelist.some((item) => {
    const allowed = extractNormalizedDomain(item);
    if (!allowed) return false;
    return target === allowed || target.endsWith(`.${allowed}`);
  });
}
