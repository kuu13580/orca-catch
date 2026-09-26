/**
 * Helper to normalize and parse amount strings (e.g. "1,234", "１，２３４") into number
 */
export function parseAmount(raw: string): number | null {
  if (!raw) return null;
  // Normalize full-width digits and commas to half-width
  const normalized = raw
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/，/g, ',')
    .replace(/,/g, '')
    .trim();

  const num = parseInt(normalized, 10);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * Helper to parse various Japanese date strings or fallback to message date
 */
export function parseDateTime(rawDate: string | undefined, fallback: Date): Date {
  if (!rawDate) return fallback;

  // Patterns like "2026/09/27 12:34", "2026-09-27 12:34", "2026年9月27日 12:34"
  const m = rawDate.match(
    /(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})日?(?:\s+(\d{1,2}):(\d{1,2}))?/
  );
  if (!m) return fallback;

  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const hour = m[4] ? parseInt(m[4], 10) : fallback.getHours();
  const minute = m[5] ? parseInt(m[5], 10) : fallback.getMinutes();

  return new Date(year, month, day, hour, minute);
}

/**
 * Clean up shop/merchant name string
 */
export function cleanShopName(raw: string | undefined): string {
  if (!raw) return '不明';
  return raw.replace(/[\r\n\t]+/g, ' ').trim() || '不明';
}
